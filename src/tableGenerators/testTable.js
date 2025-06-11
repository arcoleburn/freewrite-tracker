import {
	isToday,
	isThisWeek,
	isThisMonth,
	isThisYear,
	subDays,
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export function generateTestTable(title, data) {
	const now = new Date();

	// Helper function to determine if a date falls in the last X days
	const isInLastXDays = (date, days) => {
		const inputDate = new Date(date);
		return inputDate >= subDays(now, days);
	};

	let tableHTML = `<h1>${title}</h1>`;
	tableHTML += `
          <table border="1" style="border-collapse: collapse; width: 100%; text-align: left;">
            <thead>
              <tr>
                <th>Date</th>
                <th>Is Today</th>
                <th>Is This Week</th>
                <th>Is This Month</th>
                <th>Is This Year</th>
                <th>Is Last 7 Days</th>
                <th>Is Last 30 Days</th>
                <th>Is Last 365 Days</th>
                <th>Word Count</th>
                <th>Words Added </th>
              </tr>
            </thead>
            <tbody>
        `;
	let prevWordCount = null;
	let wordsAdded = 0;

	for (const [timestamp, wordCount] of Object.entries(data)) {
		let wordsAdded;
		// const date = parseISO(timestamp);
		const date = formatInTimeZone(timestamp, 'America/New_York', 'yyyy-MM-dd HH:mm:ss');
		if (prevWordCount === null) {
			wordsAdded += wordCount;
			prevWordCount = wordCount;
		}
		if (prevWordCount !== null) {
			wordsAdded = wordCount - prevWordCount;
			prevWordCount = wordCount;
		}
		tableHTML += `
            <tr>
              <td>${date}</td>
              <td style="color: ${isToday(date) ? 'green' : 'red'};">${isToday(date) ? 'YES' : 'NO'}</td>
              <td style="color: ${isThisWeek(date, { weekStartsOn: 0 }) ? 'green' : 'red'};">${
			isThisWeek(date, { weekStartsOn: 0 }) ? 'YES' : 'NO'
		}</td>
              <td style="color: ${isThisMonth(date) ? 'green' : 'red'};">${isThisMonth(date) ? 'YES' : 'NO'}</td>
              <td style="color: ${isThisYear(date) ? 'green' : 'red'};">${isThisYear(date) ? 'YES' : 'NO'}</td>
              <td style="color: ${isInLastXDays(date, 7) ? 'green' : 'red'};">${isInLastXDays(date, 7) ? 'YES' : 'NO'}</td>
              <td style="color: ${isInLastXDays(date, 30) ? 'green' : 'red'};">${isInLastXDays(date, 30) ? 'YES' : 'NO'}</td>
              <td style="color: ${isInLastXDays(date, 365) ? 'green' : 'red'};">${isInLastXDays(date, 365) ? 'YES' : 'NO'}</td>
              <td>${wordCount}</td>
              <td>${wordsAdded > 0 ? wordsAdded : wordCount}</td>
            </tr>
          `;
	}

	tableHTML += `</tbody></table>`;
	return tableHTML;
}
