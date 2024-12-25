// title{
// 	timestamp: wordcount
// }

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		// Handle POST request to save data
		if (request.method === 'POST' && url.pathname === '/save-stats') {
			try {
				const data = await request.json();
		
				const { title, wordCount, time } = data;

				// Create an object to store the wordcount and time
				const stats = {
					[time]: wordCount,
				};
				// console.log(stats)
				const existingData = await env.tracker.get(title);
				if (!existingData) {
					// Save it to the KV store using the title as the key
					await env.tracker.put(title, JSON.stringify(stats));
				} else {
					const data = await JSON.parse(existingData);
					data[time] = wordCount;
					await env.tracker.put(title, JSON.stringify(data));
				}

				return new Response('Data saved successfully.', { status: 200 });
			} catch (error) {
				console.error(error);
				return new Response('Failed to save data', { status: 500 });
			}
		}

		// Handle GET request to retrieve data
		if (request.method === 'GET' && url.pathname.startsWith('/get-stats')) {
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

		// If the route is not recognized
		return new Response('Not Found', { status: 404 });
	},
};
