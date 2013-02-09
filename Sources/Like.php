<?php
/**
 * Wedge
 *
 * Handles liking and unliking topics (and anything else via hooks)
 *
 * @package wedge
 * @copyright 2010-2013 Wedgeward, wedge.org
 * @license http://wedge.org/license/
 *
 * @version 0.1
 */

if (!defined('WEDGE'))
	die('Hacking attempt...');

function Like()
{
	global $topic, $context, $user_profile, $settings;

	if (isset($_REQUEST['sa']) && $_REQUEST['sa'] == 'view')
		return DisplayLike();

	if (empty(we::$id) || empty($settings['likes_enabled']))
		fatal_lang_error('no_access', false);

	// We might be doing a topic.
	if (empty($_REQUEST['msg']) || (int) $_REQUEST['msg'] == 0)
	{
		// If it isn't a topic, check the external handler, just in case. They'll have to be checking $_REQUEST themselves, and performing their own session check.
		$result = call_hook('like_handler', array(&$changes));
		if (empty($result))
			fatal_lang_error('not_a_topic', false);

		foreach ($result as $func => $response)
			list ($id_content, $content_type) = $response;
	}
	else
	{
		checkSession('get');

		$id_content = (int) $_REQUEST['msg'];
		if (isset($_GET['thought']))
		{
			$content_type = 'think';

			$request = wesql::query('
				SELECT
					h.id_thought, h.id_member
				FROM {db_prefix}thoughts AS h
				WHERE h.id_thought = {int:tid}
					AND (
						h.id_member = {int:me}
						OR h.privacy = {int:everyone}' . (we::$is_guest ? '' : '
						OR h.privacy = {int:members}
						OR FIND_IN_SET(' . implode(', h.privacy)
						OR FIND_IN_SET(', we::$user['groups']) . ', h.privacy)') . '
					)',
				array(
					'tid' => $id_content,
					'me' => we::$id,
					'everyone' => -3,
					'members' => 0,
					'per_page' => 10,
				)
			);

			$valid = false;
			if (wesql::num_rows($request) != 0)
			{
				list ($id_topic, $id_author) = wesql::fetch_row($request);
				$valid = true;
			}
			wesql::free_result($request);
			if (!$valid || (empty($settings['likes_own_posts']) && $id_author == we::$id))
				fatal_lang_error('no_access', false);

			$context['redirect_from_like'] = '#thought_update' . $id_content;
		}
		else
		{
			$content_type = 'post';

			// Validate this message is in this topic.
			$request = wesql::query('
				SELECT id_topic, id_member
				FROM {db_prefix}messages
				WHERE id_msg = {int:msg}',
				array(
					'msg' => $id_content,
				)
			);
			$in_topic = false;
			if (wesql::num_rows($request) != 0)
			{
				list ($id_topic, $id_author) = wesql::fetch_row($request);
				$in_topic = $id_topic == $topic;
			}
			wesql::free_result($request);
			if (!$in_topic || (empty($settings['likes_own_posts']) && $id_author == we::$id))
				fatal_lang_error('not_a_topic', false);

			$context['redirect_from_like'] = 'topic=' . $topic . '.msg' . $_REQUEST['msg'] . '#msg' . $_REQUEST['msg'];
		}
	}

	if (empty($id_content) || empty($content_type))
		fatal_lang_error('no_access', false);

	// Does the current user already like said content?
	$request = wesql::query('
		SELECT like_time
		FROM {db_prefix}likes
		WHERE id_content = {int:id_content}
			AND content_type = {string:content_type}
			AND id_member = {int:user}',
		array(
			'id_content' => $id_content,
			'content_type' => $content_type,
			'user' => we::$id,
		)
	);

	$like_time = time();
	if ($row = wesql::fetch_row($request))
	{
		// We had a row. Kill it.
		wesql::query('
			DELETE FROM {db_prefix}likes
			WHERE id_content = {int:id_content}
				AND content_type = {string:content_type}
				AND id_member = {int:user}',
			array(
				'id_content' => $id_content,
				'content_type' => $content_type,
				'user' => we::$id,
			)
		);
		$now_liked = false;
	}
	else
	{
		// No we didn't, insert it.
		wesql::insert('',
			'{db_prefix}likes',
			array('id_content' => 'int', 'content_type' => 'string-6', 'id_member' => 'int', 'like_time' => 'int'),
			array($id_content, $content_type, we::$id, $like_time),
			array('id_content', 'content_type', 'id_member')
		);
		$now_liked = true;
	}

	wesql::free_result($request);

	call_hook('liked_content', array(&$content_type, &$id_content, &$now_liked, &$like_time));

	if ($context['is_ajax'])
	{
		// OK, we're going to send some details back to the user through the magic of AJAX. We need to get those details, first of all.
		$members_load = array();
		$context['liked_posts'] = array();

		$request = wesql::query('
			SELECT id_content, id_member
			FROM {db_prefix}likes
			WHERE id_content = {int:id_content}
				AND content_type = {string:content_type}
			ORDER BY like_time',
			array(
				'id_content' => $id_content,
				'content_type' => $content_type,
			)
		);

		while ($row = wesql::fetch_assoc($request))
		{
			// If it's us, log it as being us.
			if ($row['id_member'] == we::$id)
				$context['liked_posts'][$row['id_content']]['you'] = true;
			// Otherwise, add it to the list, and if it's a member whose name we don't have, save that separately too. But only if we have up to 2 names.
			elseif (empty($context['liked_posts'][$row['id_content']]['names']) || count($context['liked_posts'][$row['id_content']]['names']) < 2)
			{
				$context['liked_posts'][$row['id_content']]['names'][] = $row['id_member'];
				if (!isset($user_profile[$row['id_member']]))
					$members_load[$row['id_member']] = true;
			}
			// More than 3 people liked this (not including current user)? Just get the names.
			else
			{
				if (empty($context['liked_posts'][$row['id_content']]['others']))
					$context['liked_posts'][$row['id_content']]['others'] = 1;
				else
					$context['liked_posts'][$row['id_content']]['others']++;
			}
		}
		wesql::free_result($request);

		// Any members to load? We don't need everything, just their names. Note we deliberately didn't
		// put it in the above query, because the chances are that we actually don't want all the names.
		if (!empty($members_load))
			loadMemberData(array_keys($members_load), false, 'minimal');

		loadTemplate('Msg');

		// Now the AJAXish data.
		clean_output();

		header('Content-Type: text/plain; charset=UTF-8');
		template_show_likes($id_content, true); // We must be able to like it otherwise we wouldn't be here!
		obExit(false);
	}
	else
		redirectexit($context['redirect_from_like']);
}

function DisplayLike()
{
	global $context, $txt, $memberContext;

	$_GET['cid'] = !empty($_GET['cid']) ? (int) $_GET['cid'] : 0;
	if ($_GET['cid'] == 0)
		fatal_lang_error('no_access', false);

	if (empty($_GET['type']) || !preg_match('~^[a-z0-9]{1,6}$~i', $_GET['type']))
		fatal_lang_error('no_access', false);

	$likes = array();

	$request = wesql::query('
		SELECT id_member, like_time
		FROM {db_prefix}likes
		WHERE id_content = {int:cid}
			AND content_type = {string:type}
		ORDER BY like_time DESC',
		array(
			'cid' => $_GET['cid'],
			'type' => $_GET['type'],
		)
	);
	while ($row = wesql::fetch_assoc($request))
		$likes[$row['id_member']] = $row['like_time'];

	wesql::free_result($request);

	$members = array_keys($likes);
	$members_actual = loadMemberData($members);
	if (count($members_actual) != count($members))
	{
		// So we couldn't find all the members. Let's get rid of the ones we're not interested in.
		$diff = array_diff($members, (array) $members_actual);
		foreach ($diff as $diff_item)
			unset($likes[$diff_item]);
	}

	loadTemplate('GenericPopup');
	loadLanguage('Help');
	wetem::hide();
	wetem::load('popup');

	if (empty($likes))
	{
		$context['popup_contents'] = $txt['nobody_likes_this'];
		$_POST['t'] = $txt['nobody_likes_this'];
		return;
	}

	$_POST['t'] = number_context('likes_header', count($likes));

	$context['popup_contents'] = '
	<table id="likes" class="w100 cs3">';

	foreach ($likes as $member => $like_time)
	{
		loadMemberContext($member);
		$context['popup_contents'] .= '
		<tr><td class="ava">' . $memberContext[$member]['avatar']['image'] . '</td><td class="link">' . $memberContext[$member]['link'] . '</td><td class="right">' . timeformat($like_time) . '</td></tr>';
	}

	$context['popup_contents'] .= '
	</table>';
}
