import { AxiosInstance, AxiosResponse } from "axios";
import { HTTPRequest } from "puppeteer";
import { Readable } from "stream";
import { decompress } from "./decompress.js";

export type InterceptedResponse = AxiosResponse<Buffer> & {
  rawData: Buffer;
};

export const sendRequest = async (
  axios: AxiosInstance,
  request: HTTPRequest
): Promise<InterceptedResponse> => {
  // Send request
  const requestData = request.hasPostData() ? request.postData() : undefined;
  const response = await axios<Readable>(request.url(), {
    method: request.method(),
    headers: request.headers(),
    data: requestData,
    responseType: "stream",
  });

  // Normalize header keys
  response.headers = Object.fromEntries(
    Object.entries(response.headers).map(([key, value]) => [
      key
        .split("-")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join("-"),
      value,
    ])
  );

  // Check chunked or not
  const contentEncoding = response.headers["Content-Encoding"]?.toString();
  const isChunked = response.headers["Transfer-Encoding"] === "chunked";

  const [responseData, rawData] = await new Promise<[Buffer, Buffer]>(
    (resolve, reject) => {
      let data = Buffer.alloc(0);
      let rawData = Buffer.alloc(0);

      response.data.on("data", async (chunk) => {
        data = Buffer.concat([data, chunk]);
        if (isChunked) {
          rawData = Buffer.concat([
            rawData,
            Buffer.from(`${chunk.length.toString(16)}\r\n`),
            chunk,
            Buffer.from("\r\n"),
          ]);
        } else {
          rawData = Buffer.concat([rawData, chunk]);
        }
      });
      response.data.on("error", (e) => reject(e));
      response.data.on("end", () => {
        if (isChunked) {
          rawData = Buffer.concat([rawData, Buffer.from(`0\r\n\r\n`)]);
        }
        resolve([data, rawData]);
      });
    }
  );

  return {
    ...response,
    data: await decompress(responseData, contentEncoding),
    rawData,
  };
};
