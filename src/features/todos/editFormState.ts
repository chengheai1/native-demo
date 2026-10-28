export function isSaveButtonActive({
  canSave,
  saving,
}: {
  canSave: boolean;
  saving: boolean;
}) {
  return canSave || saving;
}
