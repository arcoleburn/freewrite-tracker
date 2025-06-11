export function generateOverallStatsTable(stats) {
  // Define the time ranges to display in the overall stats table
  const periods = ['today', 'thisWeek', 'thisMonth', 'thisYear', 'past7Days', 'past30Days', 'past365Days'];

  // Create the overall table header
  let tableHtml = '<h2>Overall Stats</h2>';
  tableHtml += '<table border="1" style="width:100%; border-collapse: collapse;">';
  tableHtml += '<thead><tr><th>Period</th><th>Word Count</th></tr></thead>';
  tableHtml += '<tbody>';

  // Loop through periods and get combined stats
  periods.forEach((period) => {
    const totalWordCount = stats.combinedStats[period] || 0;
    tableHtml += `<tr><td>${period}</td><td>${totalWordCount}</td></tr>`;
  });

  tableHtml += '</tbody>';
  tableHtml += '</table>';

  return tableHtml;
}