export interface CardForms<Form extends string = string> {
  active: Form;
  available: Form[];
  cleared?: true;
}

export type RoundCardForms<Form extends string> = CardForms<Form | "none"> & { chosenRound?: number };

export function canChooseRoundCardForm<Form extends string>(forms: RoundCardForms<Form> | undefined, round: number): boolean {
  return Boolean(forms && !forms.cleared && forms.chosenRound !== round && forms.available.some((form) => form !== "none"));
}

export function nextRoundCardForm<Form extends string>(forms: RoundCardForms<Form>, order: readonly Form[]): Form | "none" {
  const active = order.findIndex((form) => form === forms.active);
  return [...order.slice(active + 1), ...order.slice(0, active + 1)].find((form) => forms.available.includes(form)) ?? "none";
}

export function spendRoundCardForms<Form extends string>(forms: RoundCardForms<Form>, order: readonly Form[], count: 1 | 2): boolean {
  if (forms.cleared || forms.active === "none" || forms.available.length <= count) return false;
  forms.available = forms.available.filter((form) => form !== forms.active);
  if (count === 2) forms.available.splice(Math.floor(Math.random() * forms.available.length), 1);
  forms.active = nextRoundCardForm(forms, order);
  return true;
}

export function activateCardForm<Form extends string>(forms: CardForms<Form>, next: Form): boolean {
  if (forms.cleared || next === forms.active || !forms.available.includes(next)) return false;
  forms.active = next;
  return true;
}

export function loseCardForms<Form extends string>(forms: CardForms<Form>, finalForm: Form, loseAll: boolean): boolean {
  if (forms.cleared || forms.active === finalForm) return false;
  forms.available = loseAll ? [] : forms.available.filter((form) => form !== forms.active);
  forms.active = forms.available[0] ?? finalForm;
  return true;
}

export function restoreCardForm<Form extends string>(forms: CardForms<Form>, form: Form): void {
  delete forms.cleared;
  if (!forms.available.includes(form)) forms.available.push(form);
  forms.active = form;
}
