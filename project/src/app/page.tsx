"use client";
import Liyanna from "../features/app";
import { AccountRecovery } from "../features/account-recovery";
import { AccountAccess } from "../features/account-access";
export default function Page() {
  return (
    <AccountRecovery>
      <AccountAccess>
        {(user, onSignOut) => (
          <Liyanna key={user.id} user={user} onSignOut={onSignOut} />
        )}
      </AccountAccess>
    </AccountRecovery>
  );
}
