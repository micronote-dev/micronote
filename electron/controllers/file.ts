import fs from "fs";

export async function writeTextFile({ payload }: { payload: { filePath: string; content: string } }): Promise<boolean> {
  const { filePath, content } = payload;

  await new Promise<void>((resolve, reject) => {
    fs.writeFile(filePath, content, "utf-8", (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

  return true;
}

export async function readTextFile(filePath: string): Promise<string> {
  const text = await fs.promises.readFile(filePath, "utf-8");
  return text;
}
