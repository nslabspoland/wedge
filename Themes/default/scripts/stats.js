/*!
 * Wedge
 *
 * The StatsCenter object, used in the statistics center.
 *
 * @package wedge
 * @copyright 2010-2011 Wedgeward, wedge.org
 * @license http://wedge.org/license/
 *
 * @version 0.1
 */

function weStatsCenter(oOptions)
{
	this.oTable = $('#' + oOptions.sTableId);

	// Is the table actually present?
	if (!this.oTable.length)
		return;

	this.opt = oOptions;
	this.oYears = {};
	this.bIsLoading = false;

	// Find all months and years defined in the table.
	var aResults = [], sYearId = null, oCurYear = null, sMonthId = null, oCurMonth = null, i, that = this;

	$('tr', this.oTable).each(function () {
		// Check if the current row represents a year.
		if ((aResults = oOptions.reYearPattern.exec(this.id)) != null)
		{
			// The id is part of the pattern match.
			sYearId = aResults[1];

			// Setup the object that'll have the state information of the year.
			that.oYears[sYearId] = {
				oCollapseImage: document.getElementById(oOptions.sYearImageIdPrefix + sYearId),
				oMonths: {}
			};

			// Create a shortcut, makes things more readable.
			oCurYear = that.oYears[sYearId];

			// Use the collapse image to determine the current state.
			oCurYear.bIsCollapsed = !$(oCurYear.oCollapseImage).hasClass('fold');

			// Setup the toggle element for the year.
			oCurYear.oToggle = new weToggle({
				bCurrentlyCollapsed: oCurYear.bIsCollapsed,
				instanceRef: that,
				sYearId: sYearId,
				funcOnBeforeCollapse: function () {
					this.opt.instanceRef.onBeforeCollapseYear(this);
				},
				aSwappableContainers: [],
				aSwapImages: [
					{
						sId: oOptions.sYearImageIdPrefix + sYearId,
						altExpanded: '-',
						altCollapsed: '+'
					}
				],
				aSwapLinks: [
					{
						sId: oOptions.sYearLinkIdPrefix + sYearId,
						msgExpanded: sYearId
					}
				]
			});
		}

		// Or maybe the current row represents a month.
		else if ((aResults = oOptions.reMonthPattern.exec(this.id)) != null)
		{
			// Set the id to the matched pattern.
			sMonthId = aResults[1];

			// Initialize the month as a child object of the year.
			oCurYear.oMonths[sMonthId] = {
				oCollapseImage: document.getElementById(oOptions.sMonthImageIdPrefix + sMonthId)
			};

			// Create a shortcut to the current month.
			oCurMonth = oCurYear.oMonths[sMonthId];

			// Determine whether the month is currently collapsed or expanded..
			oCurMonth.bIsCollapsed = !$(oCurMonth.oCollapseImage).hasClass('fold');

			var sLinkText = $('#' + oOptions.sMonthLinkIdPrefix + sMonthId).html();

			// Setup the toggle element for the month.
			oCurMonth.oToggle = new weToggle({
				bCurrentlyCollapsed: oCurMonth.bIsCollapsed,
				instanceRef: that,
				sMonthId: sMonthId,
				funcOnBeforeCollapse: function () {
					this.opt.instanceRef.onBeforeCollapseMonth(this);
				},
				funcOnBeforeExpand: function () {
					this.opt.instanceRef.onBeforeExpandMonth(this);
				},
				aSwappableContainers: [],
				aSwapImages: [
					{
						sId: oOptions.sMonthImageIdPrefix + sMonthId,
						altExpanded: '-',
						altCollapsed: '+'
					}
				],
				aSwapLinks: [
					{
						sId: oOptions.sMonthLinkIdPrefix + sMonthId,
						msgExpanded: sLinkText
					}
				]
			});

			oCurYear.oToggle.opt.aSwappableContainers.push(this.id);
		}

		else if ((aResults = oOptions.reDayPattern.exec(this.id)) != null)
		{
			oCurMonth.oToggle.opt.aSwappableContainers.push(this.id);
			oCurYear.oToggle.opt.aSwappableContainers.push(this.id);
		}
	});

	// Collapse all collapsed years!
	for (i = 0; i < oOptions.aCollapsedYears.length; i++)
		this.oYears[this.opt.aCollapsedYears[i]].oToggle.toggle();
};

weStatsCenter.prototype.onBeforeCollapseYear = function (oToggle)
{
	// Tell Wedge that all underlying months have disappeared.
	var oMon = this.oYears[oToggle.opt.sYearId].oMonths, m = oMon.length, i;
	for (i = 0; i < m; i++)
		if (oMon[i].oToggle.opt.aSwappableContainers.length > 0)
			oMon[i].oToggle.changeState(true);
};

weStatsCenter.prototype.onBeforeCollapseMonth = function (oToggle)
{
	if (!oToggle.bCollapsed)
	{
		// Tell Wedge that the state has changed.
		getXMLDocument(we_prepareScriptUrl() + 'action=stats;collapse=' + oToggle.opt.sMonthId + ';xml');

		// Remove the month rows from the year toggle.
		var aNewContainers = [], oYearToggle = this.oYears[oToggle.opt.sMonthId.substr(0, 4)].oToggle;

		for (var i = 0, c = oYearToggle.opt.aSwappableContainers, n = c.length; i < n; i++)
			if (!in_array(c[i], oToggle.opt.aSwappableContainers))
				aNewContainers.push(c[i]);

		oYearToggle.opt.aSwappableContainers = aNewContainers;
	}
};

weStatsCenter.prototype.onBeforeExpandMonth = function (oToggle)
{
	// Ignore if we're still loading the previous batch.
	if (this.bIsLoading)
		return;

	if (oToggle.opt.aSwappableContainers.length == 0)
	{
		if ('ajax_indicator' in window)
			ajax_indicator(true);
		this.oXmlRequestHandle = getXMLDocument.call(this, we_prepareScriptUrl() + 'action=stats;expand=' + oToggle.opt.sMonthId + ';xml', this.onDocReceived);
		this.bIsLoading = true;
	}
	// Silently let Wedge know this one is expanded.
	else
		getXMLDocument(we_prepareScriptUrl() + 'action=stats;expand=' + oToggle.opt.sMonthId + ';xml');
};

weStatsCenter.prototype.onDocReceived = function (oXMLDoc)
{
	// Loop through all the months we got from the XML.
	var that = this;
	$('month', oXMLDoc).each(function () {
		var
			sMonthId = this.getAttribute('id'),
			sYearId = sMonthId.substr(0, 4),
			sStart = $('#tr_month_' + sMonthId)[0].rowIndex + 1;

		// Within the current months, check out all the days.
		$('day', this).each(function (index) {
			var oCurRow = that.oTable[0].insertRow(sStart + index);
			oCurRow.className = that.opt.sDayRowClassname;
			oCurRow.id = that.opt.sDayRowIdPrefix + this.getAttribute('date');

			for (var iCellIndex = 0, iNumCells = that.opt.aDataCells.length; iCellIndex < iNumCells; iCellIndex++)
			{
				var oCurCell = oCurRow.insertCell(-1);

				if (that.opt.aDataCells[iCellIndex] == 'date')
					oCurCell.className = 'stats_day';

				oCurCell.appendChild(document.createTextNode(this.getAttribute(that.opt.aDataCells[iCellIndex])));
			}

			// Add these day rows to the toggle objects in case of collapse.
			that.oYears[sYearId].oMonths[sMonthId].oToggle.opt.aSwappableContainers.push(oCurRow.id);
			that.oYears[sYearId].oToggle.opt.aSwappableContainers.push(oCurRow.id);
		});
	});

	this.bIsLoading = false;
	ajax_indicator(false);
};
