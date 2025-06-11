import { generateDateStatsTable } from './dateStats';
import { generateOverallStatsTable } from './overallStats';
import { generateProjectStatsTable } from './projectStats';

import { startOfDay, startOfWeek, startOfMonth, startOfYear, differenceInDays } from 'date-fns';

function calculateAverageWordCount(wordsWritten, period) {
	const today = new Date();

	let periodStart;
	let daysElapsed;

	switch (period) {
		case 'week':
			periodStart = startOfWeek(today, { weekStartsOn: 1 });
			daysElapsed = differenceInDays(startOfDay(today), startOfDay(periodStart)) + 1;
			break;
		case 'month':
			periodStart = startOfMonth(today); // Start of the current month
			daysElapsed = differenceInDays(startOfDay(today), startOfDay(periodStart)) + 1;
			break;
		case 'year':
			periodStart = startOfYear(today); // Start of the current year
			daysElapsed = differenceInDays(startOfDay(today), startOfDay(periodStart)) + 1;
			break;
		default:
			throw new Error("Invalid period. Use 'week', 'month', or 'year'.");
	}

	const average = wordsWritten / daysElapsed;

	return `You've averaged ${average.toFixed(2)} words per day so far this ${period}.`;
}

export function generateStatsHtml(stats) {
	// Generate both tables
	const overallTable = generateOverallStatsTable(stats);
	const projectTable = generateProjectStatsTable(stats);
	const dateTable = generateDateStatsTable(stats.combinedStats.byDate);
	// Combine both tables into one HTML output
	return `
    <html>
      <head>
        <style>
          table, th, td { border: 1px solid black; padding: 8px; text-align: center; }
          th { background-color: #f2f2f2; }
          h2 { text-align: center; }
        </style>
      </head>
      <body>
      <p> over the last 7 days, youve averaged: ${Math.floor(stats.combinedStats.past7Days / 7)} words per day </p>
      <p> over the last 30 days, youve averaged: ${Math.floor(stats.combinedStats.past30Days / 30)} words per day </p>
      <p> over the last 365 days, youve averaged: ${Math.floor(stats.combinedStats.past365Days / 365)} words per day </p>
      <p> ------------------------------- </p>
      <p> ${calculateAverageWordCount(stats.combinedStats.thisWeek, 'week')}</p>
      <p> ${calculateAverageWordCount(stats.combinedStats.thisMonth, 'month')}</p>
      <p> ${calculateAverageWordCount(stats.combinedStats.thisYear, 'year')}</p>
        ${overallTable}
        <br>
        ${projectTable}
        <br>
        ${dateTable}
      </body>
    </html>
  `;
}
