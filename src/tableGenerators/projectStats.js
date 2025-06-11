export function generateProjectStatsTable(stats) {
	// Create the project stats table header
	let tableHtml = '<h2>Project Stats</h2>';
	tableHtml += '<table border="1" style="width:100%; border-collapse: collapse;">';
	tableHtml +=
		'<thead><tr><th>Project</th><th>Today</th><th>This Week</th><th>This Month</th><th>This Year</th><th>Past 7 Days</th><th>Past 30 Days</th><th>Past 365 Days</th></tr></thead>';
	tableHtml += '<tbody>';

	// Loop through each project in the individualStats object
	Object.keys(stats.individualStats).forEach((project) => {
		const projectStats = stats.individualStats[project];

		// Start the row for each project
		tableHtml += `<tr><td>${project}</td>`;

		// Loop through the periods for each project
		['today', 'thisWeek', 'thisMonth', 'thisYear', 'past7Days', 'past30Days', 'past365Days'].forEach((period) => {
			const wordCount = projectStats[period] || 0;
			tableHtml += `<td>${wordCount}</td>`;
		});

		tableHtml += '</tr>';
	});

	tableHtml += '</tbody>';
	tableHtml += '</table>';

	return tableHtml;
}
