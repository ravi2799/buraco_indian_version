/**
 * Handles character selection logic
 */
export default class CharacterSelection {
  constructor() {
    this.screen = document.getElementById('character-selection-screen');
    this.avatarOptions = document.querySelectorAll('.avatar-option');
    this.nicknameInput = document.getElementById('selection-nickname-input');
    this.confirmBtn = document.getElementById('confirm-character-btn');

    this.selectedAvatar = null;
    this.nickname = '';
    this.onSelectionComplete = null; // Callback

    this.init();
  }

  init() {
    // Avatar selection
    this.avatarOptions.forEach(option => {
      option.addEventListener('click', () => {
        this.selectAvatar(option.dataset.avatar);
      });
    });

    // Nickname input
    this.nicknameInput.addEventListener('input', (e) => {
      this.nickname = e.target.value.trim();
      this.validate();
    });

    // Confirm button
    this.confirmBtn.addEventListener('click', () => {
      if (this.onSelectionComplete) {
        this.onSelectionComplete({
          nickname: this.nickname,
          avatarId: this.selectedAvatar
        });
      }
    });
  }

  selectAvatar(avatarId) {
    this.selectedAvatar = avatarId;
    
    // Update UI
    this.avatarOptions.forEach(opt => {
      if (opt.dataset.avatar === avatarId) {
        opt.classList.add('selected');
      } else {
        opt.classList.remove('selected');
      }
    });

    this.validate();
  }

  validate() {
    const isValid = this.selectedAvatar && this.nickname.length >= 3;
    this.confirmBtn.disabled = !isValid;
  }
}
