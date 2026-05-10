import { wait } from "@/utils";

export const localApi = {
  async run<T>(task: () => T, delay = 350): Promise<T> {
    await wait(delay);
    return task();
  },
};

