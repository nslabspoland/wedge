/*!
 * Wedge
 *
 * These are the core JavaScript functions used on most pages generated by Wedge.
 *
 * @package wedge
 * @copyright 2010-2011 Wedgeward, wedge.org
 * @license http://wedge.org/license/
 *
 * @version 0.1
 */

var
	weEditors = [], aJumpTo = [],
	_formSubmitted = false, oThought,

	// Basic browser detection
	ua = navigator.userAgent.toLowerCase(),
	vers = $.browser.version,
	can_ajax = $.support.ajax,

	// If you need support for more versions, just test for $.browser.version yourself...
	is_opera = $.browser.opera, is_opera95up = is_opera && vers >= 9.5,
	is_ff = ua.indexOf('gecko/') != -1 && ua.indexOf('like gecko') == -1 && !is_opera, is_gecko = !is_opera && ua.indexOf('gecko') != -1,
	is_webkit = $.browser.webkit, is_chrome = ua.indexOf('chrome') != -1, is_iphone = is_webkit && ua.indexOf('iphone') != -1 || ua.indexOf('ipod') != -1,
	is_android = is_webkit && ua.indexOf('android') != -1, is_safari = is_webkit && !is_chrome && !is_iphone && !is_android,
	is_ie = $.browser.msie && !is_opera, is_ie6 = is_ie && vers == 6, is_ie7 = is_ie && vers == 7,
	is_ie8 = is_ie && vers == 8, is_ie8down = is_ie && vers < 9, is_ie9up = is_ie && !is_ie8down;

// Load an XML document using Ajax.
function getXMLDocument(sUrl, funcCallback, undefined)
{
	return $.ajax($.extend({ url: sUrl, context: this }, funcCallback !== undefined ? { success: funcCallback } : { async: false }));
}

// Send a post form to the server using Ajax.
function sendXMLDocument(sUrl, sContent, funcCallback, undefined)
{
	$.ajax($.extend({ url: sUrl, data: sContent, type: 'POST', context: this }, funcCallback !== undefined ? { success: funcCallback } : {}));
	return true;
}

String.prototype.php_urlencode = function ()
{
	return encodeURIComponent(this);
};

String.prototype.php_htmlspecialchars = function ()
{
	return this.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

String.prototype.php_unhtmlspecialchars = function ()
{
	return this.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
};

String.prototype.removeEntities = function ()
{
	return this.replace(/&(amp;)?#(\d+);/g, function (sInput, sDummy, sNum) {
		return String.fromCharCode(parseInt(sNum, 10));
	});
};

// Open a new popup window.
function reqWin(from, alternateWidth, alternateHeight, noScrollbars, noDrag, asWindow)
{
	var
		help_page = from && from.href ? from.href : from,
		vpw = $(window).width() * 0.8, vph = $(window).height() * 0.8, nextSib,
		helf = '#helf', $helf = $(helf), previousTarget = $helf.data('src'), auto = 'auto', title = $(from).text();

	alternateWidth = alternateWidth ? alternateWidth : 480;
	if ((vpw < alternateWidth) || (alternateHeight && vph < alternateHeight))
	{
		noScrollbars = 0;
		alternateWidth = Math.min(alternateWidth, vpw);
		alternateHeight = Math.min(alternateHeight, vph);
	}
	else
		noScrollbars = noScrollbars && (noScrollbars === true);

	if (asWindow)
	{
		window.open(help_page, 'requested_popup', 'toolbar=no,location=no,status=no,menubar=no,scrollbars=' + (noScrollbars ? 'no' : 'yes') + ',width=' + (alternateWidth ? alternateWidth : 480) + ',height=' + (alternateHeight ? alternateHeight : 220) + ',resizable=no');
		return false;
	}

	// Try and get the title for the current link.
	if (!title)
	{
		nextSib = from.nextSibling;
		// Newlines are seen as stand-alone text nodes, so skip these...
		while (nextSib && nextSib.nodeType == 3 && $.trim($(nextSib).text()) === '')
			nextSib = nextSib.nextSibling;
		// Get the final text, remove any dfn (description) tags, and trim the rest.
		title = $.trim($(nextSib).clone().find('dfn').remove().end().text());
	}

	// If the reqWin event was created on the fly, it'll bubble up to the body and cancel itself... Avoid that.
	$.event.fix(window.event || {}).stopPropagation();

	// Clicking the help icon twice should close the popup and remove the global click event.
	if ($('body').unbind('click.h') && $helf.remove().length && previousTarget == help_page)
		return false;

	// We create the popup inside a dummy div to fix positioning in freakin' IE.
	$('<div class="windowbg wrc' + (noDrag && (noDrag === true) ? ' nodrag' : '') + '"></div>')
		.hide()
		.load(help_page, function () {
			if (title)
				$('.windowbg2', this).first().prepend('<h6 class="top">' + title + '</h6>');
			$(this).css({
				overflow: noScrollbars ? 'hidden' : auto,
				width: alternateWidth - 25,
				height: alternateHeight ? alternateHeight - 20 : auto,
				padding: '10px 12px 12px',
				border: '1px solid #999'
			}).fadeIn(300);
			$(helf).dragslide();
		}).appendTo(
			$('<div id="helf"></div>').data('src', help_page).css({
				position: is_ie6 ? 'absolute' : 'fixed',
				width: alternateWidth,
				height: alternateHeight ? alternateHeight : auto,
				bottom: 10,
				right: 10
			}).appendTo('body')
		);

	// Clicking anywhere on the page should close the popup. The namespace is for the earlier unbind().
	$(document).bind('click.h', function (e) {
		// If we clicked somewhere in the popup, don't close it, because we may want to select text.
		if (!$(e.srcElement).parents(helf).length)
		{
			$(helf).remove();
			$(this).unbind(e);
		}
	});

	// Return false so the click won't follow the link ;)
	return false;
}

// Only allow form submission ONCE.
function submitonce()
{
	_formSubmitted = true;

	// If there are any editors warn them submit is coming!
	for (var i = 0; i < weEditors.length; i++)
		weEditors[i].doSubmit();
}

function submitThisOnce(oControl)
{
	// Hateful fix for Safari 1.3 beta.
	if (!is_safari || vers >= 2)
		$('textarea', 'form' in oControl ? oControl.form : oControl).attr('readOnly', true);

	return !_formSubmitted;
}

// Checks for variable in an array.
function in_array(variable, theArray)
{
	return $.inArray(variable, theArray) != -1;
}

// Find a specific radio button in its group and select it.
function selectRadioByName(oRadioGroup, sName)
{
	if (!('length' in oRadioGroup))
		return oRadioGroup.checked = true;

	for (var i = 0, n = oRadioGroup.length; i < n; i++)
		if (oRadioGroup[i].value == sName)
			return oRadioGroup[i].checked = true;

	return false;
}

// Invert all checkboxes at once by clicking a single checkbox.
function invertAll(oInvertCheckbox, oForm, sMask, bIgnoreDisabled)
{
	for (var i = 0, n = oForm.length; i < n; i++)
	{
		if (!('name' in oForm[i]) || (typeof sMask == 'string' && oForm[i].name.substr(0, sMask.length) != sMask && oForm[i].id.substr(0, sMask.length) != sMask))
			continue;

		if (!oForm[i].disabled || (typeof bIgnoreDisabled == 'boolean' && bIgnoreDisabled))
			oForm[i].checked = oInvertCheckbox.checked;
	}
}

// Keep the session alive - always!
(function () {
	var lastKeepAliveCheck = +new Date();

	function sessionKeepAlive()
	{
		var curTime = +new Date();

		// Prevent a Firefox bug from hammering the server.
		if (we_script && curTime - lastKeepAliveCheck > 9e5)
		{
			var tempImage = new Image();
			tempImage.src = we_prepareScriptUrl() + 'action=keepalive;time=' + curTime;
			lastKeepAliveCheck = curTime;
		}
		setTimeout(sessionKeepAlive, 12e5);
	}

	setTimeout(sessionKeepAlive, 12e5);
})();

function we_avatarResize()
{
	var tempAvatars = [], j = 0, maxWidth = we_avatarMaxSize[0], maxHeight = we_avatarMaxSize[1];
	$('img.avatar').each(function () {
		tempAvatars[j] = new Image();
		tempAvatars[j].avatar = this;

		$(tempAvatars[j++]).load(function () {
			var ava = this.avatar;
			ava.width = this.width;
			ava.height = this.height;
			if (maxWidth != 0 && this.width > maxWidth)
			{
				ava.height = (maxWidth * this.height) / this.width;
				ava.width = maxWidth;
			}
			if (maxHeight != 0 && ava.height > maxHeight)
			{
				ava.width = (maxHeight * ava.width) / ava.height;
				ava.height = maxHeight;
			}
		}).attr('src', this.src);
	});
}


// Shows the page numbers by clicking the dots (in compact view).
function expandPages(spanNode, firstPage, lastPage, perPage)
{
	var replacement = '', i = firstPage, oldLastPage, perPageLimit = 50, baseURL = $(spanNode).data('href');

	// Prevent too many pages to be loaded at once.
	if ((lastPage - firstPage) / perPage > perPageLimit)
	{
		oldLastPage = lastPage;
		lastPage = firstPage + perPageLimit * perPage;
	}

	// Calculate the new pages.
	for (; i < lastPage; i += perPage)
		replacement += '<a href="' + baseURL.replace(/%1\$d/, i).replace(/%%/g, '%') + '">' + (1 + i / perPage) + '</a> ';

	if (oldLastPage)
		replacement += '<a data-href="' + baseURL + '" onclick="expandPages(this, ' + lastPage + ', ' + oldLastPage + ', ' + perPage + ');">&hellip;</a> ';

	$(spanNode).before(replacement).remove();
}

function selectText(box)
{
	box.focus();
	box.select();
}

// Create the div for the indicator, and add the image, link to turn it off, and loading text.
function show_ajax()
{
	$('<div id="ajax_in_progress"></div>')
		.html('<a href="#" onclick="hide_ajax();"' + (we_cancel ? ' title="' + we_cancel + '"' : '') + '></a>' + we_loading)
		.css(is_ie6 ? { position: 'absolute', top: $(document).scrollTop() } : {}).appendTo('body');
}

function hide_ajax()
{
	$('#ajax_in_progress').remove();
}

// Rating boxes in Media area
function ajaxRating()
{
	$('#ratingElement').html('<img src="' + (typeof we_default_theme_url == "undefined" ? we_theme_url : we_default_theme_url) + '/images/loader.gif">');
	sendXMLDocument(
		$('#ratingForm').attr('action') + ';xml',
		'rating=' + $('#rating').val(),
		function (XMLDoc) { $('#ratingElement').html($('ratingObject', XMLDoc).text()); }
	);
}

// Find the actual position of an item.
// This is a dummy replacement for plugins -- might be removed later.
function we_itemPos(itemHandle)
{
	var offset = $(itemHandle).offset();
	return [offset.left, offset.top];
}

// This function takes the script URL and prepares it to allow the query string to be appended to it.
// It also replaces the host name with the current one. Which is required for security reasons.
function we_prepareScriptUrl()
{
	var finalUrl = we_script.indexOf('?') == -1 ? we_script + '?' : we_script +
		(we_script.charAt(we_script.length - 1) == '?' || we_script.charAt(we_script.length - 1) == '&' || we_script.charAt(we_script.length - 1) == ';' ? '' : ';');
	return finalUrl.replace(/:\/\/[^\/]+/g, '://' + window.location.host);
}

// Get the text in a code tag.
function weSelectText(oCurElement, bActOnElement)
{
	// The place we're looking for is one div up, and next door - if it's auto detect.
	var oCodeArea = (typeof bActOnElement == 'boolean' && bActOnElement) ? $('#' + oCurElement)[0] : oCurElement.parentNode.nextSibling, oCurRange;

	if (typeof oCodeArea != 'object' || oCodeArea == null)
		return false;

	// Start off with IE
	if ('createTextRange' in document.body)
	{
		oCurRange = document.body.createTextRange();
		oCurRange.moveToElementText(oCodeArea);
		oCurRange.select();
	}
	// Firefox et al.
	else if (window.getSelection)
	{
		var oCurSelection = window.getSelection();
		// Safari is special!
		if (oCurSelection.setBaseAndExtent)
		{
			var oLastChild = oCodeArea.lastChild;
			oCurSelection.setBaseAndExtent(oCodeArea, 0, oLastChild, 'innerText' in oLastChild ? oLastChild.innerText.length : oLastChild.textContent.length);
		}
		else
		{
			oCurRange = document.createRange();
			oCurRange.selectNodeContents(oCodeArea);

			oCurSelection.removeAllRanges();
			oCurSelection.addRange(oCurRange);
		}
	}

	return false;
}

// A function needed to discern HTML entities from non-western characters.
function weSaveEntities(sFormName, aElementNames, sMask)
{
	var i, f = document.forms, nm = f[sFormName], e = nm.elements, n = e.length;
	if (typeof sMask == 'string')
		for (i = 0; i < n; i++)
			if (e[i].id.substr(0, sMask.length) == sMask)
				aElementNames.push(e[i].name);

	for (i = 0, n = aElementNames.length; i < n; i++)
		if (aElementNames[i] in nm)
			nm[aElementNames[i]].value = nm[aElementNames[i]].value.replace(/&#/g, '&#38;#');
}

(function ()
{
	var origMouse, currentPos, is_fixed, currentDrag = 0;

	// You may set an area as non-draggable by adding the nodrag class to it.
	// This way, you can drag the element, but still access UI elements within it.
	$.fn.dragslide = function () {
		var origin = this.selector;
		return this
			.css("cursor", "move").find(".nodrag").css("cursor", "default").end()
			// Start the dragging process
			.mousedown(function (e) {
				if ($(e.target).parentsUntil(origin).andSelf().hasClass("nodrag"))
					return true;
				is_fixed = this.style.position == "fixed";

				// Position it to absolute, except if it's already fixed
				$(this).css({ position: is_fixed ? "fixed" : "absolute", zIndex: 999 });

				origMouse = { X: e.pageX, Y: e.pageY };
				currentPos = { X: parseInt(is_fixed ? this.style.right : this.offsetLeft, 10), Y: parseInt(is_fixed ? this.style.bottom : this.offsetTop, 10) };
				currentDrag = this;

				return false;
			});
	};

	// Updates the position during the dragging process
	$(document)
		.mousemove(function (e) {
			if (currentDrag)
			{
				// If it's in a fixed position, it's a bottom-right aligned popup.
				$(currentDrag).css(is_fixed ? {
					right: currentPos.X - e.pageX + origMouse.X,
					bottom: currentPos.Y - e.pageY + origMouse.Y
				} : {
					left: currentPos.X + e.pageX - origMouse.X,
					top: currentPos.Y + e.pageY - origMouse.Y
				});
				return false;
			}
		})
		.mouseup(function () {
			if (currentDrag)
				return !!(currentDrag = 0);
		});
})();


/**
 * Dropdown menu in JS with CSS fallback, Nao style.
 * May not show, but it took years to refine it.
 */

(function ()
{
	var menu_baseId = 0, menu_delay = [], hove = 'hove',

	// Entering a menu entry?
	menu_show_me = function ()
	{
		var
			hasul = $('ul', this)[0], style = hasul ? hasul.style : {}, is_visible = style.visibility == 'visible',
			id = this.id, parent = this.parentNode, is_top = parent.className == 'menu', d = document.dir, w = parent.clientWidth;

		if (hasul)
		{
			style.visibility = 'visible';
			style.opacity = 1;
			style['margin' + (d && d == 'rtl' ? 'Right' : 'Left')] = (is_top ? $('span', this).width() || 0 : w - 5) + 'px';
		}

		if (!is_top || !$('h4', this).first().addClass(hove).length)
			$(this).addClass(hove).parentsUntil('.menu>li').filter('li').addClass(hove);

		if (!is_visible)
			$('ul', this).first()
				.css(is_top ? { marginTop: is_ie6 || is_ie7 ? 9 : 36 } : { marginLeft: w })
				.animate(is_top ? { marginTop: is_ie6 || is_ie7 ? 6 : 33 } : { marginLeft: w - 5 }, 'fast');

		clearTimeout(menu_delay[id.substring(2)]);

		$(this).siblings('li').each(function () { menu_hide_children(this.id); });
	},

	// Leaving a menu entry?
	menu_hide_me = function (e)
	{
		// The deepest level should hide the hover class immediately.
		if (!$(this).children('ul').length)
			$(this).children().andSelf().removeClass(hove);

		// Are we leaving the menu entirely, and thus triggering the time
		// threshold, or are we just switching to another menu item?
		var id = this.id;
		$(e.relatedTarget).parents('.menu').length ?
			menu_hide_children(id) :
			menu_delay[id.substring(2)] = setTimeout(function () { menu_hide_children(id); }, 250);
	},

	// Hide all children menus.
	menu_hide_children = function (id)
	{
		$('#' + id).children().andSelf().removeClass(hove).find('ul').css({ visibility: 'hidden', opacity: +is_ie8down });
	};

	// Make sure to only call this on one element...
	$.fn.menu = function ()
	{
		var elem = this.show();
		$('h4+ul', elem).prepend('<li class="menu-top"></li>');

		$('li', elem).each(function () {
			$(this).attr('id', 'li' + menu_baseId++)
				.bind('mouseenter focus', menu_show_me)
				.bind('mouseleave blur', menu_hide_me)
				.mousedown(false)
				.click(function () {
					$('.' + hove).removeClass(hove);
					$('ul', elem).css({ visibility: 'hidden', opacity: +is_ie8down });
				});
		});

		// Now that JS is ready to take action... Disable the pure CSS menu!
		$('.css.menu').removeClass('css');
		return this;
	};
})();


// *** weCookie class.
function weCookie()
{
	this._cookies = {};

	if ('cookie' in document && document.cookie != '')
	{
		var aCookieList = document.cookie.split(';');
		for (var i = 0, n = aCookieList.length; i < n; i++)
		{
			var aNameValuePair = aCookieList[i].split('=');
			this._cookies[aNameValuePair[0].replace(/^\s+|\s+$/g, '')] = decodeURIComponent(aNameValuePair[1]);
		}
	}
};

weCookie.prototype.get = function (sKey)
{
	return sKey in this._cookies ? this._cookies[sKey] : null;
};

weCookie.prototype.set = function (sKey, sValue)
{
	document.cookie = sKey + '=' + encodeURIComponent(sValue);
};


// *** weToggle class.
function weToggle(oOptions)
{
	this.opt = oOptions;
	this._collapsed = false;
	this._cookie = null;

	// If cookies are enabled and they were set, override the initial state.
	if ('oCookieOptions' in this.opt && this.opt.oCookieOptions.bUseCookie)
	{
		// Initialize the cookie handler.
		this._cookie = new weCookie();

		// Check if the cookie is set.
		var cookieValue = this._cookie.get(this.opt.oCookieOptions.sCookieName);
		if (cookieValue != null)
			this.opt.bCurrentlyCollapsed = cookieValue == '1';
	}

	// If the init state is set to be collapsed, collapse it.
	if (this.opt.bCurrentlyCollapsed)
		this.cs(true, true);

	// Initialize the images to be clickable.
	var i, n, toggle_me = function () {
		$(this).data('that').toggle();
		this.blur();
		return false;
	};

	if ('aSwapImages' in this.opt)
		for (i = 0, n = this.opt.aSwapImages.length; i < n; i++)
			$('#' + this.opt.aSwapImages[i].sId).show().css('visibility', 'visible').data('that', this).click(toggle_me).css('cursor', 'pointer').mousedown(false);

	// Initialize links.
	if ('aSwapLinks' in this.opt)
		for (i = 0, n = this.opt.aSwapLinks.length; i < n; i++)
			$('#' + this.opt.aSwapLinks[i].sId).show().data('that', this).click(toggle_me);
};

// Change State - collapse or expand the section.
weToggle.prototype.cs = function (bCollapse, bInit)
{
	var i, n, o, op, iSpeed = bInit ? 0 : 300;

	// Handle custom function hook before collapse.
	if (!bInit && bCollapse && 'funcOnBeforeCollapse' in this.opt)
		this.opt.funcOnBeforeCollapse.call(this);

	// Handle custom function hook before expand.
	else if (!bInit && !bCollapse && 'funcOnBeforeExpand' in this.opt)
		this.opt.funcOnBeforeExpand.call(this);

	// Loop through all the images that need to be toggled.
	if ('aSwapImages' in this.opt)
	{
		op = this.opt.aSwapImages;
		for (i = 0, n = op.length; i < n; i++)
		{
			var sAlt = bCollapse && op[i].altCollapsed ? op[i].altCollapsed : op[i].altExpanded, icon = $('#' + op[i].sId);
			icon.toggleClass('fold', !bCollapse).attr('title', sAlt);
		}
	}

	// Loop through all the links that need to be toggled.
	if ('aSwapLinks' in this.opt)
		for (i = 0, op = this.opt.aSwapLinks, n = op.length; i < n; i++)
			$('#' + op[i].sId).html(bCollapse && op[i].msgCollapsed ? op[i].msgCollapsed : op[i].msgExpanded);

	// Now go through all the sections to be collapsed.
	for (i = 0, op = this.opt.aSwappableContainers, n = op.length; i < n; i++)
		(o = $('#' + op[i])) && bCollapse ? o.slideUp(iSpeed) : o.slideDown(iSpeed);

	// Update the new state.
	this._collapsed = bCollapse;

	// Update the cookie, if desired.
	if ('oCookieOptions' in this.opt && (op = this.opt.oCookieOptions) && op.bUseCookie)
		this._cookie.set(op.sCookieName, this._collapsed ? '1' : '0');

	if (!bInit && 'oThemeOptions' in this.opt && (op = this.opt.oThemeOptions) && op.bUseThemeSettings)
	{
		// Set a theme option through javascript.
		var tempImage = new Image();
		tempImage.src = we_prepareScriptUrl() + 'action=jsoption;var=' + op.sOptionName + ';val=' + +this._collapsed + ';' + we_sessvar + '=' + we_sessid + (op.sAdditionalVars || '') + ('sThemeId' in op ? '&th=' + op.sThemeId : '') + ';time=' + (+new Date());
	}
};

// Reverse the current state.
weToggle.prototype.toggle = function ()
{
	this.cs(!this._collapsed);
};



// *** JumpTo class.
function JumpTo(opt)
{
	this.opt = opt;
	var sContainer = opt.sContainerId, aBoardsAndCategories = [], i, n;

	$('#' + sContainer).find('label')
		.append('<select id="' + sContainer + '_select"><option>=> ' + opt.sPlaceholder + '</option></select>')
		.find('select').sb({ fixed: true }).focus(function ()
		{
			show_ajax();

			$('we item', getXMLDocument(we_prepareScriptUrl() + 'action=ajax;sa=jumpto;xml').responseXML).each(function () {
				aBoardsAndCategories.push({
					id: parseInt(this.getAttribute('id'), 10),
					cat: this.getAttribute('type') == 'cat',
					name: $(this).text().removeEntities(),
					url: this.getAttribute('url'),
					level: parseInt(this.getAttribute('level'), 10)
				});
			});

			hide_ajax();

			// Fill the jump to box with entries. Method of the JumpTo class.
			for (i = 0, n = aJumpTo.length; i < n; i++)
			{
				var
					that = aJumpTo[i], sList = '', k, p, $val,
					$dropdownList = $('#' + that.opt.sContainerId + '_select').unbind('focus');

				// Loop through all items to be added.
				for (k = 0, p = aBoardsAndCategories.length; k < p; k++)
				{
					// Just for the record, we don't NEED to close the optgroup at the end
					// of the list, even if it doesn't feel right. Saves us a few bytes...
					if (aBoardsAndCategories[k].cat)
						sList += '<optgroup label="' + aBoardsAndCategories[k].name + '">';
					else
						// Show the board option, with special treatment for the current one.
						sList += '<option value="' + aBoardsAndCategories[k].url + '"' + (aBoardsAndCategories[k].id == that.opt.iBoardId ? ' disabled>=> ' + aBoardsAndCategories[k].name + ' &lt;='
								: '>' + new Array(aBoardsAndCategories[k].level + 1).join('==') + '=> ' + aBoardsAndCategories[k].name) + '</option>';
				}

				// Add the remaining items after the currently selected item.
				$dropdownList.append(sList).change(function () {
					if (this.selectedIndex > 0 && ($val = $(this).val()))
						window.location.href = $val.indexOf('://') > -1 ? $val : we_script.replace(/\?.*/g, '') + $val;
				}).sb("focus");
			}
		});
};



// *** Thought class.
function Thought(opt)
{
	if (!can_ajax)
		return;

	this.opt = opt;
	this.ajaxUrl = we_prepareScriptUrl() + 'action=ajax;sa=thought;xml;';

	$('#thought_update')
		.attr('title', opt.sLabelThought)
		.click(function () { oThought.edit(''); });
	$('.thought').each(function () {
		var thought = $(this), tid = thought.data('tid'), mid = thought.data('mid');
		if (tid)
		{
			thought.after('\
		<div class="thought_actions">\
			<input type="button" class="submit" value="' + opt.sEdit + '" onclick="oThought.edit(' + tid + (mid ? ', ' + mid : ', \'\'') + ');">\
			<input type="button" class="new" value="' + opt.sReply + '" onclick="oThought.edit(' + tid + (mid ? ', ' + mid : ', \'\'') + ', true);">\
			<input type="button" class="delete" value="' + opt.sDelete + '" onclick="oThought.remove(' + tid + ');">\
		</div>');
		}
	});
};

// Show the input after the user has clicked the text.
Thought.prototype.edit = function (tid, mid, is_new, text)
{
	this.cancel();

	var
		thought = $('#thought_update' + tid), was_personal = thought.find('span').first().html(), opt = this.opt, privacies = opt.aPrivacy, privacy = thought.data('prv'),
		cur_text = is_new ? text || '' : (was_personal.toLowerCase() == opt.sNoText.toLowerCase() ? '' : (was_personal.indexOf('<') == -1 ?
		was_personal.php_unhtmlspecialchars() : this.getText(tid))), p, pr = '';
	for (p in privacies)
		pr += '<option value="' + p + '"' + (p == privacy ? ' selected' : '') + '>' + privacies[p] + '</option>';

	// Hide current thought and edit/modify/delete links, and add tools to write new thought.
	thought.toggle(is_new && tid).next().addClass('hide').after('\
		<form id="thought_form">\
			<input type="text" maxlength="255" id="ntho">\
			<select id="npriv">' + pr + '</select>\
			<input type="hidden" id="noid" value="' + (is_new ? 0 : thought.data('oid')) + '">\
			<input type="submit" value="' + opt.sSubmit + '" onclick="oThought.submit(\'' + tid + '\', \'' + (mid || tid) + '\'); return false;" class="save">\
			<input type="button" value="' + opt.sCancel + '" onclick="oThought.cancel(); return false;" class="cancel">\
		</form>');
	$('#ntho').focus().val(cur_text);
	$('#npriv').sb();
};

Thought.prototype.getText = function (id)
{
	return $('thought', getXMLDocument(this.ajaxUrl + 'in=' + id).responseXML).text();
};

// Make that personal text editable (again)!
Thought.prototype.cancel = function ()
{
	$('#thought_form').prev().removeClass('hide').prev().show().end().end().remove();
};

// Event handler for removal requests.
Thought.prototype.remove = function (tid)
{
	var to_del = $('#thought_update' + tid);

	show_ajax();

	sendXMLDocument(this.ajaxUrl + 'remove', 'oid=' + to_del.data('oid'));

	// We'll be assuming Wedge uses table tags to show thought lists.
	to_del.parents('tr').first().remove();

	hide_ajax();
};

// Event handler for clicking submit.
Thought.prototype.submit = function (tid, mid)
{
	var that = this;
	show_ajax();

	sendXMLDocument(
		that.ajaxUrl,
		'parent=' + tid + '&master=' + mid + '&oid=' + $('#noid').val().php_urlencode() + '&privacy=' + $('#npriv').val().php_urlencode() + '&text=' + $('#ntho').val().php_urlencode(),
		function (XMLDoc) {
			var thought = $('thought', XMLDoc), nid = tid ? thought.attr('id') : tid, new_thought = $('#new_thought'), new_id = '#thought_update' + nid, user = $('user', XMLDoc);
			if (!$(new_id).length)
				new_thought.after(new_thought.html().replace('{date}', $('date', XMLDoc).text()).replace('{uname}', user.text()).replace('{text}', thought.text()));
			$(new_id + ' span').html(thought.text());
			that.cancel();
			hide_ajax();
		}
	);
};

/* Optimize:
_cookie = _k
_collapsed = _c
_formSubmitted = _f
*/
