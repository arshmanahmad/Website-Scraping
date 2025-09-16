# Ali1688 Product Scraper

A Node.js web scraper built with Playwright that extracts detailed product information from Ali1688.com product pages. The scraper uses human-like behavior patterns to avoid detection and includes CAPTCHA solving capabilities.

## Features

- **Human-like Scraping**: Implements realistic mouse movements, scrolling patterns, and timing delays
- **CAPTCHA Handling**: Automatic slider CAPTCHA solving with best-effort heuristics
- **Comprehensive Data Extraction**: Extracts product details, pricing, images, SKUs, shipping info, and seller data
- **JSON Output**: Clean, structured JSON output for easy integration
- **Anti-Detection**: Uses randomized user agents, viewport sizes, and browser fingerprinting

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

## Usage

Run the scraper with a 1688.com product URL:

```bash
npm run scrape -- https://detail.1688.com/offer/951728697627.html
```

### Example

```bash
npm run scrape -- https://detail.1688.com/offer/951728697627.html
```

This will output a JSON object containing:
- Product title and offer ID
- Pricing information
- Product images and videos
- Product attributes and specifications
- SKU variations with pricing and stock
- Packaging information
- Shipping details and restrictions
- Seller information
- Sales data and ratings

## Project Structure

```
Website-Scraping/
├── package.json          # Project dependencies and scripts
├── scraper.js            # Main scraper application
├── playwright.config.js  # Playwright configuration
└── README.md            # This file
```

## Dependencies

- **@playwright/test**: Browser automation and web scraping
- **Node.js**: JavaScript runtime environment

## Configuration

The scraper uses the following configuration:
- **Browser**: Microsoft Edge (configurable)
- **Headless Mode**: Disabled by default for debugging
- **Timeout**: 60 seconds for page loads
- **User Agent**: Randomized Chrome/Edge user agents
- **Viewport**: Random desktop resolutions (1200-1440px width)

## Output Format

The scraper returns a JSON object with the following structure:

```json
{
  "ok": true,
  "url": "https://detail.1688.com/offer/951728697627.html",
  "scrapedAt": "2024-01-01T00:00:00.000Z",
  "data": {
    "title": "Product Title",
    "offerId": "951728697627",
    "priceDisplay": "¥100.00",
    "currency": "CNY",
    "images": ["image1.jpg", "image2.jpg"],
    "video": "video_url",
    "attributes": [{"name": "Color", "value": "Red"}],
    "skus": [{"label": "Size M", "price": "100", "stock": "1000", "skuId": "123"}],
    "packaging": [{"skuId": "123", "color": "Red", "weight_g": "500"}],
    "shipping": {
      "location": "Guangdong",
      "freeShipping": true,
      "deliveryLimitDays": 7,
      "excludeAreas": []
    },
    "rating": {"score": 5.0, "count": 100},
    "sales": {"period": "30 days", "countText": "1000+"},
    "seller": {
      "companyName": "Company Name",
      "memberId": "123456",
      "loginId": "seller123",
      "shopUrl": "https://shop.1688.com"
    }
  }
}
```

## Error Handling

If scraping fails, the output will be:

```json
{
  "ok": false,
  "error": "Error message description"
}
```

## Notes

- The scraper includes anti-detection measures to avoid being blocked
- CAPTCHA solving is best-effort and may not work in all cases
- The scraper waits for dynamic content to load before extracting data
- Human-like behavior patterns help avoid rate limiting