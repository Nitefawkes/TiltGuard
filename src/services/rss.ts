// RSS Feed service for TiltGuard - Curated content and triggers for bettors

import { XMLParser } from 'fast-xml-parser';

export interface RSSFeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: Date;
  category?: string;
  source: string;
  feedType: FeedType;
  triggerType?: TriggerType;
  priority: 'high' | 'medium' | 'low';
}

export type FeedType =
  | 'responsible-gambling'
  | 'betting-education'
  | 'sports-news'
  | 'injury-report'
  | 'line-movement'
  | 'custom';

export type TriggerType =
  | 'tilt-management'
  | 'bankroll-advice'
  | 'strategy-tip'
  | 'injury-alert'
  | 'line-shift'
  | 'responsible-gambling-reminder'
  | 'none';

export interface RSSFeedConfig {
  id: string;
  name: string;
  url: string;
  type: FeedType;
  enabled: boolean;
  updateInterval: number; // minutes
  lastFetched?: number;
}

// Curated RSS Feeds for Betting Responsibility and Education
export const CURATED_FEEDS: RSSFeedConfig[] = [
  {
    id: 'ncpg',
    name: 'National Council on Problem Gambling',
    url: 'https://www.ncpgambling.org/feed/',
    type: 'responsible-gambling',
    enabled: true,
    updateInterval: 360, // 6 hours
  },
  {
    id: 'gamcare',
    name: 'GamCare UK',
    url: 'https://www.gamcare.org.uk/feed/',
    type: 'responsible-gambling',
    enabled: true,
    updateInterval: 360,
  },
  {
    id: 'bettingeducation',
    name: 'Betting Education Network',
    url: 'https://www.actionnetwork.com/education/feed',
    type: 'betting-education',
    enabled: true,
    updateInterval: 180, // 3 hours
  },
  {
    id: 'espn',
    name: 'ESPN - Sports News',
    url: 'https://www.espn.com/espn/rss/news',
    type: 'sports-news',
    enabled: false, // Opt-in for news
    updateInterval: 60, // 1 hour
  },
  {
    id: 'rotowire-injuries',
    name: 'RotoWire - Injury Reports',
    url: 'https://www.rotowire.com/rss/news.php',
    type: 'injury-report',
    enabled: false, // Opt-in
    updateInterval: 30, // 30 minutes
  },
];

/**
 * Fetch and parse RSS feed
 */
export async function fetchRSSFeed(
  feedConfig: RSSFeedConfig
): Promise<RSSFeedItem[]> {
  try {
    const response = await fetch(feedConfig.url, {
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const result = parser.parse(xmlText);

    // Handle different RSS formats (RSS 2.0, Atom, etc.)
    let items: any[] = [];

    if (result.rss?.channel?.item) {
      items = Array.isArray(result.rss.channel.item)
        ? result.rss.channel.item
        : [result.rss.channel.item];
    } else if (result.feed?.entry) {
      items = Array.isArray(result.feed.entry)
        ? result.feed.entry
        : [result.feed.entry];
    }

    const parsedItems: RSSFeedItem[] = items.map((item, index) => {
      // Extract data (handles both RSS and Atom formats)
      const title = item.title?._text || item.title || '';
      const description =
        item.description?._text ||
        item.description ||
        item.summary?._text ||
        item.summary ||
        item.content?._text ||
        item.content ||
        '';
      const link = item.link?.['@_href'] || item.link || item.id || '';
      const pubDate = item.pubDate || item.published || item.updated || new Date().toISOString();

      // Analyze content for triggers
      const analysis = analyzeContent(title, description, feedConfig.type);

      return {
        id: `${feedConfig.id}-${Date.now()}-${index}`,
        title: cleanText(title),
        description: cleanText(description),
        link,
        pubDate: new Date(pubDate),
        source: feedConfig.name,
        feedType: feedConfig.type,
        triggerType: analysis.triggerType,
        priority: analysis.priority,
      };
    });

    return parsedItems;
  } catch (error) {
    console.error(`Error fetching RSS feed ${feedConfig.name}:`, error);
    return [];
  }
}

/**
 * Analyze content to determine trigger type and priority
 */
function analyzeContent(
  title: string,
  description: string,
  feedType: FeedType
): { triggerType: TriggerType; priority: 'high' | 'medium' | 'low' } {
  const content = `${title} ${description}`.toLowerCase();

  // High priority triggers - immediate notifications
  const tiltKeywords = [
    'tilt',
    'chasing losses',
    'stop betting',
    'take a break',
    'losing streak',
    'problem gambling',
    'addiction',
    'self-exclusion',
  ];

  const bankrollKeywords = [
    'bankroll management',
    'money management',
    'budget',
    'stake sizing',
    'unit sizing',
    'risk management',
  ];

  const strategyKeywords = [
    'betting strategy',
    'value betting',
    'edge',
    'expected value',
    'EV',
    'sharp',
    'closing line value',
    'CLV',
  ];

  const injuryKeywords = [
    'injury',
    'injured',
    'out for',
    'questionable',
    'doubtful',
    'DNP',
    'ruled out',
    'sidelined',
  ];

  const responsibleKeywords = [
    'responsible gambling',
    'gamble responsibly',
    'help',
    'support',
    'counseling',
    'hotline',
  ];

  // Check for tilt management content
  if (tiltKeywords.some((keyword) => content.includes(keyword))) {
    return { triggerType: 'tilt-management', priority: 'high' };
  }

  // Check for bankroll advice
  if (bankrollKeywords.some((keyword) => content.includes(keyword))) {
    return { triggerType: 'bankroll-advice', priority: 'high' };
  }

  // Check for strategy tips
  if (strategyKeywords.some((keyword) => content.includes(keyword))) {
    return { triggerType: 'strategy-tip', priority: 'medium' };
  }

  // Check for injury alerts
  if (injuryKeywords.some((keyword) => content.includes(keyword))) {
    return { triggerType: 'injury-alert', priority: 'medium' };
  }

  // Check for responsible gambling reminders
  if (responsibleKeywords.some((keyword) => content.includes(keyword))) {
    return {
      triggerType: 'responsible-gambling-reminder',
      priority: 'high',
    };
  }

  // Default based on feed type
  if (feedType === 'responsible-gambling') {
    return {
      triggerType: 'responsible-gambling-reminder',
      priority: 'medium',
    };
  }

  if (feedType === 'betting-education') {
    return { triggerType: 'strategy-tip', priority: 'medium' };
  }

  return { triggerType: 'none', priority: 'low' };
}

/**
 * Clean HTML and special characters from text
 */
function cleanText(text: string): string {
  if (!text) return '';

  return (
    text
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#39;/g, "'")
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Fetch all enabled feeds
 */
export async function fetchAllFeeds(
  feeds: RSSFeedConfig[]
): Promise<RSSFeedItem[]> {
  const enabledFeeds = feeds.filter((f) => f.enabled);

  const results = await Promise.allSettled(
    enabledFeeds.map((feed) => fetchRSSFeed(feed))
  );

  const allItems: RSSFeedItem[] = [];

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  });

  // Sort by date (newest first) and priority
  return allItems.sort((a, b) => {
    // High priority first
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (a.priority !== 'high' && b.priority === 'high') return 1;

    // Then by date
    return b.pubDate.getTime() - a.pubDate.getTime();
  });
}

/**
 * Filter items by trigger type
 */
export function filterByTriggerType(
  items: RSSFeedItem[],
  triggerType: TriggerType
): RSSFeedItem[] {
  return items.filter((item) => item.triggerType === triggerType);
}

/**
 * Filter items by feed type
 */
export function filterByFeedType(
  items: RSSFeedItem[],
  feedType: FeedType
): RSSFeedItem[] {
  return items.filter((item) => item.feedType === feedType);
}

/**
 * Get high priority items (for notifications)
 */
export function getHighPriorityItems(
  items: RSSFeedItem[]
): RSSFeedItem[] {
  return items.filter((item) => item.priority === 'high');
}

/**
 * Check if feed should be updated based on interval
 */
export function shouldUpdateFeed(feed: RSSFeedConfig): boolean {
  if (!feed.lastFetched) return true;

  const now = Date.now();
  const intervalMs = feed.updateInterval * 60 * 1000;

  return now - feed.lastFetched >= intervalMs;
}

/**
 * Get items from last N hours
 */
export function getRecentItems(
  items: RSSFeedItem[],
  hours: number = 24
): RSSFeedItem[] {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;

  return items.filter((item) => item.pubDate.getTime() >= cutoff);
}

/**
 * Search items by keywords
 */
export function searchItems(
  items: RSSFeedItem[],
  query: string
): RSSFeedItem[] {
  const lowerQuery = query.toLowerCase();

  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Group items by feed type
 */
export function groupByFeedType(
  items: RSSFeedItem[]
): Record<FeedType, RSSFeedItem[]> {
  const grouped: Record<string, RSSFeedItem[]> = {
    'responsible-gambling': [],
    'betting-education': [],
    'sports-news': [],
    'injury-report': [],
    'line-movement': [],
    custom: [],
  };

  items.forEach((item) => {
    if (!grouped[item.feedType]) {
      grouped[item.feedType] = [];
    }
    grouped[item.feedType].push(item);
  });

  return grouped as Record<FeedType, RSSFeedItem[]>;
}
