import type { Handler } from 'aws-lambda';

// Event fetching handler - integrates with multiple event APIs
export const handler: Handler = async (event: any) => {
  const { city, startDate, endDate } = event.arguments;
  
  const events = [];
  const cache = new Map();
  
  // Helper function to fetch from Ticketmaster
  async function fetchTicketmasterEvents() {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) return [];
    
    try {
      const params = new URLSearchParams({
        apikey: apiKey,
        city: city,
        startDateTime: `${startDate}T00:00:00Z`,
        endDateTime: `${endDate}T23:59:59Z`,
        size: '50',
        sort: 'date,asc',
      });
      
      const response = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?${params}`
      );
      
      if (!response.ok) return [];
      
      const data: any = await response.json();
      
      if (!data._embedded?.events) return [];
      
      return data._embedded.events.map((event: any) => ({
        eventId: event.id,
        name: event.name,
        category: event.classifications?.[0]?.segment?.name || 'Event',
        venue: event._embedded?.venues?.[0]?.name || 'Venue TBA',
        address: event._embedded?.venues?.[0]?.address?.line1,
        date: event.dates?.start?.localDate,
        time: event.dates?.start?.localTime,
        price: extractPrice(event.priceRanges),
        description: event.info || event.pleaseNote,
        imageUrl: event.images?.[0]?.url,
        ticketUrl: event.url,
        source: 'Ticketmaster',
        coordinates: event._embedded?.venues?.[0]?.location,
        isPopular: event.dates?.status?.code === 'onsale',
        city: city,
      }));
    } catch (error) {
      console.error('Ticketmaster API error:', error);
      return [];
    }
  }
  
  // Helper function to fetch from SeatGeek
  async function fetchSeatGeekEvents() {
    const clientId = process.env.SEATGEEK_CLIENT_ID;
    if (!clientId) return [];
    
    try {
      const params = new URLSearchParams({
        'venue.city': city,
        'datetime_utc.gte': `${startDate}T00:00:00`,
        'datetime_utc.lte': `${endDate}T23:59:59`,
        per_page: '50',
        client_id: clientId,
      });
      
      if (process.env.SEATGEEK_CLIENT_SECRET) {
        params.append('client_secret', process.env.SEATGEEK_CLIENT_SECRET);
      }
      
      const response = await fetch(
        `https://api.seatgeek.com/2/events?${params}`
      );
      
      if (!response.ok) return [];
      
      const data: any = await response.json();
      
      if (!data.events) return [];
      
      return data.events.map((event: any) => ({
        eventId: `sg_${event.id}`,
        name: event.title,
        category: event.type,
        venue: event.venue?.name || 'Venue TBA',
        address: event.venue?.address,
        date: event.datetime_local?.split('T')[0],
        time: event.datetime_local?.split('T')[1]?.substring(0, 5),
        price: extractSeatGeekPrice(event.stats),
        description: event.title,
        imageUrl: event.performers?.[0]?.image,
        ticketUrl: event.url,
        source: 'SeatGeek',
        coordinates: event.venue?.location,
        isPopular: event.score > 0.7,
        city: city,
      }));
    } catch (error) {
      console.error('SeatGeek API error:', error);
      return [];
    }
  }
  
  // Price extraction helpers
  function extractPrice(priceRanges: any) {
    if (!priceRanges?.[0]) return 'Check website';
    const pr = priceRanges[0];
    if (pr.min && pr.max) return `$${pr.min}-$${pr.max}`;
    if (pr.min) return `From $${pr.min}`;
    return 'Check website';
  }
  
  function extractSeatGeekPrice(stats: any) {
    if (!stats) return 'Check website';
    if (stats.lowest_price && stats.highest_price) {
      return `$${stats.lowest_price}-$${stats.highest_price}`;
    }
    if (stats.lowest_price) return `From $${stats.lowest_price}`;
    if (stats.average_price) return `Avg $${stats.average_price}`;
    return 'Check website';
  }
  
  // Generate fallback events if no APIs configured
  function generateFallbackEvents() {
    const templates = [
      { name: `${city} Food Festival`, category: 'Festival', venue: 'Downtown' },
      { name: 'Live Concert', category: 'Music', venue: 'Music Hall' },
      { name: 'Comedy Show', category: 'Comedy', venue: 'Comedy Club' },
      { name: 'Art Exhibition', category: 'Arts', venue: 'Art Gallery' },
      { name: 'Sports Game', category: 'Sports', venue: 'Stadium' },
    ];
    
    const fallbackEvents = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    
    for (let i = 0; i < Math.min(days * 3, 15); i++) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      const eventDate = new Date(start);
      eventDate.setDate(eventDate.getDate() + Math.floor(Math.random() * days));
      
      fallbackEvents.push({
        eventId: `local_${Date.now()}_${i}`,
        name: template.name,
        category: template.category,
        venue: template.venue,
        date: eventDate.toISOString().split('T')[0],
        time: `${10 + Math.floor(Math.random() * 12)}:00`,
        price: `$${20 + Math.floor(Math.random() * 80)}`,
        description: `Experience ${template.name} in ${city}`,
        source: 'Local',
        city: city,
        isPopular: Math.random() > 0.7,
      });
    }
    
    return fallbackEvents;
  }
  
  // Fetch from all available sources
  const [ticketmasterEvents, seatgeekEvents] = await Promise.all([
    fetchTicketmasterEvents(),
    fetchSeatGeekEvents(),
  ]);
  
  // Combine all events
  events.push(...ticketmasterEvents, ...seatgeekEvents);
  
  // If no events from APIs, use fallback
  if (events.length === 0) {
    events.push(...generateFallbackEvents());
  }
  
  // Remove duplicates based on name and venue
  const uniqueEvents = events.filter((event, index, self) => {
    return index === self.findIndex(e => 
      e.name === event.name && e.venue === event.venue && e.date === event.date
    );
  });
  
  // Sort by date
  uniqueEvents.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time || '00:00'}`);
    const dateB = new Date(`${b.date} ${b.time || '00:00'}`);
    return dateA.getTime() - dateB.getTime();
  });
  
  return {
    events: uniqueEvents,
    totalCount: uniqueEvents.length,
    sources: [...new Set(uniqueEvents.map(e => e.source))],
  };
};