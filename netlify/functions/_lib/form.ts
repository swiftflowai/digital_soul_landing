import Busboy from "busboy";

export function parseMultipart(req: Request): Promise<{
  fields: Record<string, string>;
  files: { fieldname: string; filename: string; mime: string; buffer: Buffer }[];
}> {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: Object.fromEntries(req.headers.entries()) as any });
    const fields: Record<string, string> = {};
    const files: { fieldname: string; filename: string; mime: string; buffer: Buffer }[] = [];

    bb.on("file", (fieldname, file, info) => {
      const { filename, mimeType } = (info as unknown) as { filename: string; mimeType: string };
      const chunks: Buffer[] = [];
      file.on("data", (d: Buffer) => chunks.push(d));
      file.on("end", () => files.push({ fieldname, filename, mime: mimeType, buffer: Buffer.concat(chunks) }));
    });
    bb.on("field", (name, val) => {
      fields[name] = val;
    });
    bb.on("error", reject);
    bb.on("finish", () => resolve({ fields, files }));

    try {
      // In Netlify runtime, Request.body may be a web ReadableStream (no .pipe)
      // Try piping if it's a Node stream, otherwise read to Buffer and end()
      // @ts-ignore - opaque type
      const maybeNodeStream = req.body as any;
      if (maybeNodeStream && typeof maybeNodeStream.pipe === "function") {
        maybeNodeStream.pipe(bb);
      } else {
        req
          .arrayBuffer()
          .then(ab => {
            const buf = Buffer.from(ab);
            bb.end(buf);
          })
          .catch(reject);
      }
    } catch (err) {
      reject(err as Error);
    }
  });
}


