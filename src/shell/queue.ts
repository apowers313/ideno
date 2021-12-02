export interface IteratorInterface<TaskType> {
    next: () => NextInterface<TaskType>;
}

export interface NextInterface<TaskType> {
    done: boolean;
    value: Promise<TaskType> | null;
}

export interface ReturnInterface {
    done: boolean;
}

export interface ThrowInterface {
    done: boolean;
    value: Promise<Error>;
}

export type cbFn = (...args: Array<undefined>) => Promise<undefined>;

export type ResolveFn<TaskType> = (val: TaskType) => void;

interface TaskInterface {
    run: () => void;
}

// deno-lint-ignore no-explicit-any
export class Task<Args extends Array<any>, Ret> {
    private fn: (...args: Args) => Ret;
    private args: Args;

    constructor (fn: (...args: Args) => Ret, ...args: Args) {
        this.fn = fn;
        this.args = args;
    }

    run(): Ret {
        return this.fn(...this.args);
    }
}

export class TaskQueue<TaskType extends TaskInterface> {
    done = false;
    taskQueue: Array<TaskType> = [];
    pendingRequest: ResolveFn<TaskType> | null = null;

    async run(): Promise<void> {
        for await (const taskPromise of this) {
            if (!taskPromise) {
                throw new Error("got null task promise, should be impossible");
            }
            const task = await taskPromise;
            if (!task) {
                throw new Error("got null task, should be impossible");
            }
            await task.run();
        }
    }

    getTask(): Promise<TaskType> {
        return new Promise((resolve) => {
            // if we already have a queue going, pull from the queue
            if (this.taskQueue.length !== 0) {
                console.log("pulling task from queue");
                const task = this.taskQueue.shift();
                if (!task) {
                    throw new Error("array malfunction");
                }
                return resolve(task);
            }

            // if there's not a queue, save the request until we have a task
            if (this.pendingRequest) {
                throw new Error("already have a pending request");
            }
            console.log("task queue empty, waiting for task...");
            this.pendingRequest = resolve;
        });
    }

    addTask(task: TaskType) {
        // if we have a request waiting, run the task
        if (this.pendingRequest) {
            console.log("received task, resuming queue");
            this.pendingRequest(task);
            this.pendingRequest = null;
            return;
        }

        // if no request waiting, queue the request for the future
        console.log("queue running, storing task");
        this.taskQueue.push(task);
    }

    [Symbol.asyncIterator](): IteratorInterface<TaskType> {

        const iter = {
            next: () => {
                const retVal: Promise<TaskType> | null = this.done ? null : this.getTask();
                console.log("next retVal", retVal);
                return {
                    done: this.done,
                    value: retVal
                };
            },
        };

        return iter;
    }
}