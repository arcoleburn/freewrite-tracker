import {
	isToday,
	isThisWeek,
	isThisMonth,
	isThisYear,
	differenceInDays,
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { generateTestTable } from './tableGenerators/testTable';
import { generateStatsHtml } from './tableGenerators/fullStats';

function updateOrAddKey(obj, key, value) {
	if (key in obj) {
		obj[key] += value; // If the key exists, add the value to the existing one
	} else {
		obj[key] = value; // If the key doesn't exist, create it with the given value
	}
}

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
			const timeZone = 'America/New_York';

			const getAllData = async () => {
				// const keys = await env.tracker.list();

				const data = {};

				// loop over all projects
				for (const key of keys.keys) {
					// get data for project
					const value = await env.tracker.get(key.name); // Fetch value as JSON
					try {
						const parsed = JSON.parse(value);

						const dataInTZ = Object.fromEntries(
							Object.entries(parsed).map(([timestamp, wordCount]) => [
								formatInTimeZone(timestamp, timeZone, 'yyy-MM-dd HH:mm:ss'),
								wordCount,
							])
						);
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
						byDate: {},
					},
				};

				// Current date for range calculations
				const now = formatInTimeZone(new Date(), timeZone, 'yyy-MM-dd');

				// Iterate over each project
				for (let projectName in data) {
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
					for (let [timeStamp, wordCount] of Object.entries(projectData)) {
						const dateOfEntry = new Date(timeStamp);

						// Calculate the difference in word count
						const difference = wordCount - previousWordCount;
						if (difference > 0) {
							updateOrAddKey(result.combinedStats.byDate, timeStamp.split(' ')[0], difference);

							// Today
							if (isToday(dateOfEntry)) {
								result.individualStats[projectName].today += difference;
								result.combinedStats.today += difference;
							}

							// This week
							if (isThisWeek(dateOfEntry, { weekStartsOn: 1 })) {
								result.individualStats[projectName].thisWeek += difference;
								result.combinedStats.thisWeek += difference;
							}

							// This month
							if (isThisMonth(dateOfEntry)) {
								result.individualStats[projectName].thisMonth += difference;
								result.combinedStats.thisMonth += difference;
							}

							// This year
							if (isThisYear(dateOfEntry)) {
								result.individualStats[projectName].thisYear += difference;
								result.combinedStats.thisYear += difference;
							}

							// Past 7 days
							if (Math.abs(differenceInDays(now, dateOfEntry)) <= 7) {
								result.individualStats[projectName].past7Days += difference;
								result.combinedStats.past7Days += difference;
							}

							// Past 30 days
							if (Math.abs(differenceInDays(now, dateOfEntry)) <= 30) {
								result.individualStats[projectName].past30Days += difference;
								result.combinedStats.past30Days += difference;
							}

							// Past 365 days
							if (Math.abs(differenceInDays(now, dateOfEntry)) <= 365) {
								result.individualStats[projectName].past365Days += difference;
								result.combinedStats.past365Days += difference;
							}
						}
						// Update the previous word count
						previousWordCount = wordCount;
					}
				}
				return result;
			}

			const stats = calculateWordCountByRangeForMultipleProjects(data);

			const generateTestHTML = () => {
				let res;
				for (const key of keys.keys) {
					res += generateTestTable(key.name, data[key.name]);
				}
				return res;
			};

			const html = url.pathname.includes('test') ? generateStatsHtml(stats) + generateTestHTML() : generateStatsHtml(stats);

			return new Response(html, {
				headers: { 'Content-Type': 'text/html' },
			});
		}
		// If the route is not recognized
		return new Response('Not Found', { status: 404 });
	},
};
