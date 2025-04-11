import { ClientRequest } from "http";
import { HTTPRequest } from "puppeteer";
import { RequestResponse, RequestResponse_Scheme } from "./http-record";
import { InterceptedResponse } from "./request";

export const getScheme = (url: URL) => {
  if (url.protocol === "http:") return RequestResponse_Scheme.HTTP;
  if (url.protocol === "https:") return RequestResponse_Scheme.HTTPS;
  return null;
};

const getRequestBody = async (request: HTTPRequest) => {
  const body = request.hasPostData() ? request.postData() : undefined;
  return body ? Buffer.from(body) : null;
};
// Compose headers to satisfy the interface
const composeHeaders = (headers: Record<string, string | string[]>) => {
  return Object.entries(headers).flatMap(([key, value]) =>
    Array.isArray(value)
      ? value.map((v) => ({ key: Buffer.from(key), value: Buffer.from(v) }))
      : [{ key: Buffer.from(key), value: Buffer.from(value) }]
  );
};

/**
 * Encode the request and response to a buffer
 * @param request - Request
 * @param response - Response
 * @param userAgent - User agent
 * @returns - Buffer
 */
export const encode = async (
  request: HTTPRequest,
  response: InterceptedResponse,
  userAgent: string
): Promise<Uint8Array | null> => {
  const requestUrl = new URL(request.url());
  const scheme = getScheme(requestUrl);
  if (!scheme) return null;

  // Get body
  const requestBody = await getRequestBody(request);
  const responseBody = response.rawData;

  // Check address is available
  if (
    !(response.request instanceof ClientRequest) ||
    response.request.socket === null ||
    response.request.socket.remoteAddress === undefined ||
    response.request.socket.remotePort === undefined
  ) {
    return null;
  }

  return RequestResponse.encode({
    ip: response.request.socket.remoteAddress,
    port: response.request.socket.remotePort,
    scheme,
    request: {
      firstLine: Buffer.from(
        `${request.method().toUpperCase()} ${requestUrl.pathname}${
          requestUrl.search
        }${requestUrl.hash} HTTP/1.1`
      ),
      header: composeHeaders({
        host: requestUrl.host,
        "user-agent": userAgent,
        ...request.headers(),
      }),
      body: requestBody ? Buffer.from(requestBody) : undefined,
    },
    response: {
      firstLine: Buffer.from(
        `HTTP/1.1 ${response.status} ${response.statusText}`
      ),
      header: composeHeaders(
        Object.fromEntries(
          Object.entries(response.headers).map(([key, value]) => [
            key,
            value ?? [],
          ])
        )
      ),
      body: responseBody ? responseBody : undefined,
    },
  }).finish();
};
