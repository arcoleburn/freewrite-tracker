import {
	isToday,
	isThisWeek,
	isThisMonth,
	isThisYear,
	differenceInDays,
	subDays,
	startOfDay,
	startOfWeek,
	startOfMonth,
	startOfYear,
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		// Handle POST request to save data
		if (request.method === 'POST' && url.pathname === '/save-stats') {
			try {
				const data = await request.json();
				const { title, wordcount, time } = data;

				// Create an object to store the wordcount and time

				const label = time ? time.toString() : 'unknown';

				const stats = {
					[label]: wordcount,
				};

				const existingData = await env.tracker.get(title);

				if (!existingData) {
					// Save it to the KV store using the title as the key
					await env.tracker.put(title, JSON.stringify(stats));
				} else {
					const projectData = await JSON.parse(existingData);
					projectData[time] = wordcount;
					await env.tracker.put(title, JSON.stringify(projectData));
				}

				return new Response('Data saved successfully.', { status: 200 });
			} catch (error) {
				console.error(error);
				return new Response('Failed to save data', { status: 500 });
			}
		}

		// Handle GET request to retrieve data
		if (request.method === 'GET' && url.pathname.startsWith('/get-stats')) {
			// not sure we need this?
			const title = url.pathname.split('/').pop(); // Extract the title from the URL path

			try {
				// Retrieve the data from KV using the title as the key
				const stats = await env.tracker.get(title);

				if (stats) {
					return new Response(stats, { status: 200 });
				} else {
					return new Response('Not Found', { status: 404 });
				}
			} catch (error) {
				console.error(error);
				return new Response('Failed to retrieve data', { status: 500 });
			}
		}
		if (url.pathname.startsWith('/view-stats')) {
			const keys = await env.tracker.list();

			const getAllData = async () => {
				console.log('GETTING ALL DATA');
				// const keys = await env.tracker.list();

				const timeZone = 'America/New_York';

				const data = {};

				// loop over all projects
				for (const key of keys.keys) {
					// get data for project
					const value = await env.tracker.get(key.name); // Fetch value as JSON
					console.log('NAME', key.name)
					try {
						// const date = parseISO(key.name);
						// console.log({ key, date });
						// const TZDate = utcToZonedTime(date, timeZone);
						// const formatted = format(TZDate, 'yyyy-MM-dd HH:mm:ssXXX', { timeZone }).toString();

						// const formatted = formatInTimeZone(date, 'America/New_York', 'yyyy-MM-dd HH:mm:ss zzz'); // 2014-10-25 06:46:20 EST
						// console.log(formatted);

						const parsed = JSON.parse(value);

						const dataInTZ = Object.fromEntries(
							Object.entries(parsed).map(([timestamp, wordCount]) => [
								formatInTimeZone(timestamp, timeZone, 'yyy-MM-dd HH:mm:ss'),
								wordCount,
							])
						);
						console.log('PARSED', {parsed})
						console.log('TZ', {dataInTZ})
						data[key.name] = dataInTZ;

					} catch (error) {
						data[key.name] = value;
					}
				}
				return data;
			};

			const data = await getAllData();

			const mockData = {
				'Project X': {
					'2024-11-15T14:33:25.000Z': 0,
					'2024-12-20T12:05:42.134Z': 1000,
					'2024-12-24T19:20:13.743Z': 3000,
					'2024-12-25T21:13:58.743Z': 4095,
					'2024-12-25T21:31:15.213Z': 5000,
					'2024-12-27T09:00:00.000Z': 5500, // Added entry for today (12/27)
				},
				'Word Tracker Testing': {
					'2024-12-15T08:55:12.560Z': 0,
					'2024-12-22T09:45:15.200Z': 45,
					'2024-12-23T15:00:30.500Z': 55,
					'2024-12-25T21:01:15.644Z': 74,
					'2024-12-25T21:01:45.331Z': 100,
					'2024-12-27T10:00:00.000Z': 250, // Added entry for today (12/27)
				},
				'Creative Writing Marathon': {
					'2024-11-18T13:30:00.000Z': 0,
					'2024-12-10T08:30:12.123Z': 25,
					'2024-12-20T10:10:10.789Z': 100,
					'2024-12-22T14:00:00.456Z': 150,
					'2024-12-25T16:00:00.123Z': 250,
					'2024-12-27T11:30:00.000Z': 300, // Added entry for today (12/27)
				},
				'Poetry Project': {
					'2024-11-15T16:00:00.100Z': 0,
					'2024-12-15T12:20:05.300Z': 60,
					'2024-12-23T10:00:00.500Z': 70,
					'2024-12-24T19:20:13.134Z': 100,
					'2024-12-25T17:00:00.234Z': 200,
					'2024-12-27T12:00:00.000Z': 300, // Added entry for today (12/27)
				},
			};

			function calculateWordCountByRangeForMultipleProjects(data) {
				const result = {
					individualStats: {},
					combinedStats: {
						today: 0,
						thisWeek: 0,
						thisMonth: 0,
						thisYear: 0,
						past7Days: 0,
						past30Days: 0,
						past365Days: 0,
					},
				};

				// Current date for range calculations
				const now = new Date();

				// Iterate over each project
				for (let projectName in data) {
					// console.log('looping for stats:', projectName);
					const projectData = data[projectName];
					let previousWordCount = 0;

					// Initialize the result for this project
					result.individualStats[projectName] = {
						today: 0,
						thisWeek: 0,
						thisMonth: 0,
						thisYear: 0,
						past7Days: 0,
						past30Days: 0,
						past365Days: 0,
					};

					// Iterate through the timestamps and calculate word counts
					for (let [timestamp, wordCount] of Object.entries(projectData)) {
						const dateOfEntry = formatInTimeZone(timestamp, 'America/New_York', 'yyyy-MM-dd HH:mm:ss');
						// console.log('inner stats loop');
						// console.table({ projectData, timestamp, wordCount });
						// For the first entry, skip counting and set the starting point
						// if (previousWordCount === 0) {
						// 	previousWordCount = wordCount;
						// 	continue;
						// }

						// Calculate the difference in word count
						const difference = wordCount - previousWordCount;
						// console.log('Difference since last entry:', difference);
						if (difference > 0) {
							// Today
							if (isToday(dateOfEntry)) {
								// console.log('log is from today');
								result.individualStats[projectName].today += difference;
								result.combinedStats.today += difference;

								// console.log(result);
							}

							// This week
							if (isThisWeek(dateOfEntry)) {
								// console.log('log is from this week');
								result.individualStats[projectName].thisWeek += difference;
								result.combinedStats.thisWeek += difference;
								// console.log(result);
							}

							// This month
							if (isThisMonth(dateOfEntry)) {
								// console.log('log is from this month');
								result.individualStats[projectName].thisMonth += difference;
								result.combinedStats.thisMonth += difference;
								// console.log(result);
							}

							// This year
							if (isThisYear(dateOfEntry)) {
								result.individualStats[projectName].thisYear += difference;
								result.combinedStats.thisYear += difference;
								// console.log('log is from this year');
								// console.log(result);
							}

							// Past 7 days
							if (differenceInDays(now, dateOfEntry) <= 7) {
								result.individualStats[projectName].past7Days += difference;
								result.combinedStats.past7Days += difference;
								// console.log('log is from past 7 days');
								// console.log(result);
							}

							// Past 30 days
							if (differenceInDays(now, dateOfEntry) <= 30) {
								result.individualStats[projectName].past30Days += difference;
								result.combinedStats.past30Days += difference;

								// console.log('log is from past 30 days');
								// console.log(result);
							}

							// Past 365 days
							if (differenceInDays(now, dateOfEntry) <= 365) {
								result.individualStats[projectName].past365Days += difference;
								result.combinedStats.past365Days += difference;
								// console.log('log is from past 365 days');
								// console.log(result);
							}
						}

						// Update the previous word count
						previousWordCount = wordCount;
					}
				}

				return result;
			}

			const stats = calculateWordCountByRangeForMultipleProjects(data);

			// console.log(stats);

			function generateOverallStatsTable(stats) {
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
					tableHtml += `<tr><td>${capitalizeFirstLetter(period)}</td><td>${totalWordCount}</td></tr>`;
				});

				tableHtml += '</tbody>';
				tableHtml += '</table>';

				return tableHtml;
			}

			function generateProjectStatsTable(stats) {
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

			function generateStatsHtml(stats) {
				// Generate both tables
				const overallTable = generateOverallStatsTable(stats);
				const projectTable = generateProjectStatsTable(stats);

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
						</body>
					</html>
				`;
			}

			// Helper function to capitalize the first letter of a string
			function capitalizeFirstLetter(string) {
				return string.charAt(0).toUpperCase() + string.slice(1);
			}

			function generateHTML(data) {
				let html = `<html>
				<head>
					<title>Word Count Data</title>
					<style>
						body { font-family: Arial, sans-serif; margin: 20px; }
						table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
						th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
						th { background-color: #f4f4f4; }
						caption { font-size: 18px; font-weight: bold; margin: 10px 0; }
					</style>
				</head>
				<body>`;

				for (const [title, records] of Object.entries(data)) {
					html += `<h2>${title}</h2>
					<table>
						<thead>
							<tr>
								<th>Timestamp</th>
								<th>Word Count</th>
							</tr>
						</thead>
						<tbody>`;

					for (const [timestamp, wordCount] of Object.entries(records)) {
						html += `<tr>
							<td>${timestamp}</td>
							<td>${wordCount}</td>
						</tr>`;
					}

					html += `</tbody>
					</table>`;
				}

				html += `</body>
				</html>`;

				return html;
			}

			function generateTestTable(title, data) {
				const now = new Date();

				// Helper function to determine if a date falls in the last X days
				const isInLastXDays = (date, days) => {
					return date >= subDays(now, days);
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
						console.log('no prev word count');
						wordsAdded += wordCount;
						console.log({ wordsAdded });
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
							<td style="color: ${isThisWeek(date, { weekStartsOn: 0 }) ? 'green' : 'red'};">${isThisWeek(date, { weekStartsOn: 0 }) ? 'YES' : 'NO'}</td>
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

			const generateTestHTML = () => {
				let res;
				// console.log('keys', keys.keys);
				for (const key of keys.keys) {
					res += generateTestTable(key.name, data[key.name]);
				}
				return res;
			};
			const html = generateStatsHtml(stats) + generateTestHTML();

			return new Response(html, {
				headers: { 'Content-Type': 'text/html' },
			});
		}
		// If the route is not recognized
		return new Response('Not Found', { status: 404 });
	},
};
// 	async fetch(request) {
// 		const getAllData = async () => {
// 			const keys = await env.tracker.list();

// 			const data = {};

// 			for (const key of keys.keys) {
// 				const value = await env.tracker.get(key.name, { type: 'json' }); // Fetch value as JSON
// 				data[key.name] = JSON.parse(value);
// 			}
// 		};

// 		const data = await getAllData();
// 		console.log({ data });
// 		const html = `
// 		<!DOCTYPE html>
// 		<html lang="en">
// 			<head>
// 				<meta charset="UTF-8">
// 				<meta name="viewport" content="width=device-width, initial-scale=1.0">
// 				<title>Cloudflare Worker HTML</title>
// 				<style>
// 					body { font-family: Arial, sans-serif; margin: 2rem; }
// 					h1 { color: #0078D7; }
// 				</style>
// 			</head>
// 			<body>
// 				<h1>Welcome to Cloudflare Workers</h1>
// 				<p>This is a simple HTML response served by a Cloudflare Worker.</p>
// 			</body>
// 		</html>
// 	`;

// 		return new Response(html, {
// 			headers: { 'Content-Type': 'text/html' },
// 		});
// 	},
// };
