import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ClipboardUtilityService {
  private readonly COPY_FEEDBACK_DURATION = 1000;

  async copyTextToClipboard(text: string, targetElement?: HTMLElement): Promise<void> {
    try {
      await this.performCopyOperation(text);
      
      if (targetElement) {
        this.showCopyFeedback(targetElement);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw error;
    }
  }

  private async performCopyOperation(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
  }

  private showCopyFeedback(targetElement: HTMLElement): void {
    const originalText = targetElement.innerText;
    
    this.updateElementForFeedback(targetElement);
    
    setTimeout(() => {
      this.restoreElementAfterFeedback(targetElement, originalText);
    }, this.COPY_FEEDBACK_DURATION);
  }

  private updateElementForFeedback(targetElement: HTMLElement): void {
    targetElement.innerText = 'Kopiert!';
    targetElement.style.background = '#4caf50';
  }

  private restoreElementAfterFeedback(targetElement: HTMLElement, originalText: string): void {
    targetElement.innerText = originalText;
    targetElement.style.background = '';
  }
}