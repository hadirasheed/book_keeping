"use client";

import { Landmark, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BankAccount } from "@/lib/types";

interface Props {
  account: BankAccount;
  onEdit?: (account: BankAccount) => void;
  onDelete?: (account: BankAccount) => void;
}

export function BankAccountCard({ account, onEdit, onDelete }: Props) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary">
            <Landmark className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{account.account_name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {account.bank_name}
              {account.account_number_last4
                ? ` •••• ${account.account_number_last4}`
                : ""}{" "}
              · {account.currency}
            </p>
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(account)}
                aria-label="Edit account"
              >
                <Pencil className="size-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(account)}
                aria-label="Delete account"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
