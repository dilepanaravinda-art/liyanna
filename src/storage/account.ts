import { createLocalRepository, getLocalFlag, setLocalFlag } from "./local";
function identity(id: string) {
  if (!id.trim()) throw Error("Account required");
  return encodeURIComponent(id);
}
export const accountDatabaseName = (userId: string) =>
  `liyanna-account-${identity(userId)}`;
export const createAccountRepository = (userId: string) =>
  createLocalRepository(accountDatabaseName(userId));
export const getAccountFlag = <T>(userId: string, key: string) =>
  getLocalFlag<T>(`account:${identity(userId)}:${key}`);
export const setAccountFlag = (userId: string, key: string, value: unknown) =>
  setLocalFlag(`account:${identity(userId)}:${key}`, value);
