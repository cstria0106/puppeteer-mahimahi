# puppeteer-mahimahi

Records HTTP requests and responses in mahimahi format.

## How to use

```ts
import { startRecording } from "puppeteer-mahimahi";

const page = await browser.newPage();

const stopRecording = await startRecording(page, "recordings/example.com", {
    // User agent string (required)
    userAgent: "USER_AGENT",
    // Callback when intercepted request fails (optional)
    onError: (request, error) => { 
        console.error(error);
    },
});

await page.goto("https://example.com");
await page.close();

await stopRecording();
```

## How it works

- Intercepts the puppeteer page request
- Sends the request using axios
- Decodes the response and responds to the puppeteer page
- Encodes the request and raw response into a protobuf message

## Notes

- This library is not tested well
- All messages are saved as HTTP/1.1
- Supports 'Content-Encoding: br / gzip / deflate'
- Supports 'Transfer-Encoding: chunked' (but not Trailer header)

## License
MIT
