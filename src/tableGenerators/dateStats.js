import {
	subDays,
	isWithinInterval,
} from 'date-fns';

export const generateDateStatsTable = (stats) => {
	const now = new Date();
	const oneYearAgo = subDays(now, 365);

	// Filter the data for dates within the last 365 days
	const filteredData = Object.entries(stats).filter(([date]) => {
		const parsedDate = new Date(date);
		return isWithinInterval(parsedDate, { start: oneYearAgo, end: now });
	});

	const sortedData = filteredData.sort(([dateA], [dateB]) => {
		return new Date(dateB) - new Date(dateA); // DateB first to ensure reverse order
	});

	// Generate the HTML table
	const generateTable = (data) => {
		let table = `
    <h2>Total Word Count by Date</h2>
    <table border="1" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr>
          <th style="padding: 8px; text-align: left;">Date</th>
          <th style="padding: 8px; text-align: left;">Word Count</th>
        </tr>
      </thead>
      <tbody>
  `;

		data.forEach(([date, wordCount]) => {
			table += `
      <tr>
        <td style="padding: 8px;">${date}</td>
        <td style="padding: 8px;">${wordCount}</td>
      </tr>
    `;
		});

		table += `
      </tbody>
    </table>
  `;

		return table;
	};

	// Generate and display the table with the filtered data
	const htmlTable = generateTable(sortedData);
	return htmlTable;
};
