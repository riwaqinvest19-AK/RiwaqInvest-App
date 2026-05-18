let recoveryActive = false;

export function setPasswordRecoveryActive(next: boolean) {
  recoveryActive = next;
}

export function isPasswordRecoveryActive() {
  return recoveryActive;
}
