import axios, { type AxiosInstance } from "axios";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import type { HTTPRequest, Page } from "puppeteer";
import { encode, getScheme } from "./encode.js";
import { InterceptedResponse, sendRequest } from "./request.js";

/**
 * Callback when intercepted request fails
 */
type OnError = (request: HTTPRequest, e: unknown) => Promise<void> | void;

type Context = {
  directory: string;
  axios: AxiosInstance;
  userAgent: string;
  onError?: OnError;
};

/**
 * Handler for intercepted requests
 */
const onRequest = (context: Context) => async (request: HTTPRequest) => {
  const requestUrl = new URL(request.url());

  // Check scheme is valid (http or https)
  const scheme = getScheme(requestUrl);
  if (!scheme) {
    return request.continue();
  }

  // Send request and get response
  let response: InterceptedResponse;
  try {
    response = await sendRequest(context.axios, request);
  } catch (e: unknown) {
    await context.onError?.(request, e);
    return request.continue();
  }

  // Respond with the response
  await request.respond({
    status: response.status,
    headers: response.headers,
    body: response.data,
  });

  // Encode the request and raw response and save to file
  const encoded = await encode(request, response, context.userAgent);
  if (encoded) {
    await fs.writeFile(`${context.directory}/save.${randomUUID()}`, encoded);
  }
};

type Options = {
  /**
   * User agent string
   */
  userAgent: string;
  /**
   * Callback when intercepted request fails
   */
  onError?: OnError;
};

/**
 * Start recording the HTTP requests and responses in mahimahi format
 * @param page - Puppeteer page
 * @param directory - Directory to save the recorded objects
 * @param options - Options
 * @returns - Cleanup function
 */
export const startRecording = async (
  page: Page,
  directory: string,
  options: Options
) => {
  // Ensure the directory exists
  await fs.mkdir(directory, { recursive: true });

  // Enable request interception
  await page.setRequestInterception(true);

  const context: Context = {
    directory,
    axios: axios.create({
      validateStatus: () => true,
      maxRedirects: 0,
      decompress: false,
    }),
    userAgent: options.userAgent,
    onError: options.onError,
  };

  const requestHandler = onRequest(context);

  page.on("request", requestHandler);
  return async () => {
    page.off("request", requestHandler);
  };
};
