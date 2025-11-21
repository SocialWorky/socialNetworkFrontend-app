import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';
import { Message } from '../../interfaces/message.interface';
import { Token } from '@shared/interfaces/token.interface';

@Component({
  selector: 'worky-chat-list',
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ChatListComponent implements AfterViewChecked, OnChanges {
  @Input() messages: Message[] = [];
  @Input() currentUserId: string | null = null;
  @Input() otherUserName: string = '';
  @Input() otherUserAvatar: string | null = null;
  @Input() isLoading = false;
  @Input() loadingMoreMessages = false;
  @Input() hasMoreMessages = true;
  @Input() otherUserTyping = false;
  @Input() decodedToken!: Token;
  @Input() editingMessageId: string | null = null;
  @Input() editingMessageContent = '';

  @Output() scrollUp = new EventEmitter<void>();
  @Output() reply = new EventEmitter<Message>();
  @Output() edit = new EventEmitter<Message>();
  @Output() delete = new EventEmitter<Message>();
  @Output() saveEdit = new EventEmitter<{id: string, content: string}>();
  @Output() cancelEditEvent = new EventEmitter<void>();
  @Output() openUrlEvent = new EventEmitter<string>();
  @Output() messageAction = new EventEmitter<{action: string, message: Message}>();
  @Output() editingContentChange = new EventEmitter<string>();

  @ViewChild('messagesContainer', { static: false }) messagesContainer!: ElementRef;

  showScrollToBottomButton = false;
  private userScrolling = false;
  private scrollTimeout: any;
  private loadMoreTimeout: any;
  private isAtBottom = true;
  private initialLoad = true;
  private scrollPositioned = false;
  private isRestoringScroll = false;
  private anchorMessageId: string | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['messages'] && this.messages.length > 0) {
      const previousMessages = changes['messages'].previousValue;
      const currentMessages = changes['messages'].currentValue;
      const isFirstLoad = !previousMessages || previousMessages.length === 0;
      
      if (isFirstLoad) {
        this.initialLoad = true;
        this.scrollPositioned = false;
        
        setTimeout(() => {
          this.initialLoad = false;
        }, 800);
      } else {
        // Check if messages were prepended (loading previous messages)
        const isPrepended = previousMessages.length > 0 && 
                           currentMessages.length > previousMessages.length && 
                           currentMessages[0]._id !== previousMessages[0]._id;

        if (isPrepended && this.messagesContainer) {
          this.preserveScrollPosition(previousMessages, currentMessages);
        } else if (this.isAtBottom && !this.isRestoringScroll) {
          // If we were at bottom, stay at bottom (for new incoming messages)
          requestAnimationFrame(() => {
            if (this.messagesContainer && !this.isRestoringScroll) {
              const element = this.messagesContainer.nativeElement;
              element.scrollTop = element.scrollHeight;
            }
          });
        }
      }
    }
  }

  private preserveScrollPosition(previousMessages: Message[], currentMessages: Message[]) {
    if (!this.messagesContainer) return;

    const element = this.messagesContainer.nativeElement;
    
    // Find the first visible message before loading (our anchor)
    const scrollTop = element.scrollTop;
    const containerRect = element.getBoundingClientRect();
    
    // Find anchor message - the first message that was visible before loading
    let anchorMessage: Message | null = null;
    if (previousMessages.length > 0) {
      // Use the first message from the previous list as anchor
      anchorMessage = previousMessages[0];
      this.anchorMessageId = anchorMessage._id;
    }

    if (!this.anchorMessageId) return;

    // Set flag to prevent interference
    this.isRestoringScroll = true;

    // Disable smooth scrolling temporarily
    element.style.scrollBehavior = 'auto';

    // Wait for DOM to update with multiple frames to ensure rendering is complete
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!this.messagesContainer || !this.anchorMessageId) {
            this.isRestoringScroll = false;
            return;
          }

          // Find the anchor message element in the DOM
          const anchorElement = element.querySelector(`[data-message-id="${this.anchorMessageId}"]`);
          
          if (anchorElement) {
            // Scroll to keep the anchor message in the same position
            const anchorRect = anchorElement.getBoundingClientRect();
            const offsetFromTop = anchorRect.top - containerRect.top;
            
            // Adjust scroll to maintain the anchor's position
            anchorElement.scrollIntoView({ block: 'start', behavior: 'auto' });
          } else {
            // Fallback: use height difference method
            const newScrollHeight = element.scrollHeight;
            const oldScrollHeight = scrollTop + element.clientHeight;
            const heightDifference = newScrollHeight - oldScrollHeight;
            element.scrollTop = scrollTop + heightDifference;
          }

          // Re-enable smooth scrolling
          setTimeout(() => {
            if (this.messagesContainer) {
              this.messagesContainer.nativeElement.style.scrollBehavior = '';
            }
            this.isRestoringScroll = false;
            this.anchorMessageId = null;
          }, 100);
        });
      });
    });
  }

  ngAfterViewChecked() {
    if (this.initialLoad && this.messages.length > 0 && this.messagesContainer && !this.scrollPositioned && !this.isRestoringScroll) {
      const element = this.messagesContainer.nativeElement;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      
      if (scrollHeight > clientHeight) {
        element.style.scrollBehavior = 'auto';
        element.scrollTop = scrollHeight;
        
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (this.messagesContainer && !this.scrollPositioned && !this.isRestoringScroll) {
              const finalElement = this.messagesContainer.nativeElement;
              finalElement.scrollTop = finalElement.scrollHeight;
              finalElement.style.scrollBehavior = '';
              this.isAtBottom = true;
              this.scrollPositioned = true;
              
              setTimeout(() => {
                this.initialLoad = false;
              }, 500);
            }
          });
        });
      } else if (scrollHeight > 0) {
        this.scrollPositioned = true;
        setTimeout(() => {
          this.initialLoad = false;
        }, 500);
      }
    }
  }

  onScroll(event: any) {
    const element = event.target;
    const scrollTop = element.scrollTop;
    const clientHeight = element.clientHeight;
    const scrollHeight = element.scrollHeight;
    
    const atBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
    
    this.isAtBottom = atBottom;
    this.showScrollToBottomButton = !atBottom;

    // Infinite scroll: Load more messages when within threshold from top
    // Optimized for maximum fluidity - load very early to ensure seamless experience
    const threshold = 1200; // Load when within 1200px of top (3-4 screens ahead)
    
    if (scrollTop <= threshold && this.hasMoreMessages && !this.loadingMoreMessages) {
      // Minimal debounce for near-instant response
      clearTimeout(this.loadMoreTimeout);
      this.loadMoreTimeout = setTimeout(() => {
        if (!this.loadingMoreMessages && this.hasMoreMessages) {
          this.scrollUp.emit();
        }
      }, 50); // Minimal debounce - just enough to group rapid scroll events
    }

    this.userScrolling = true;
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.userScrolling = false;
    }, 200);
  }

  scrollToBottomSmooth() {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
    }
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  trackByMessageId(index: number, message: Message): string {
    return message._id || index.toString();
  }

  startReplyToMessage(message: Message) {
    this.reply.emit(message);
  }

  startEditMessage(message: Message) {
    this.edit.emit(message);
  }

  deleteMessage(message: Message) {
    this.delete.emit(message);
  }

  saveEditedMessage(id: string, event?: any) {
    this.saveEdit.emit({ id, content: this.editingMessageContent });
  }

  cancelEdit() {
    this.cancelEditEvent.emit();
  }

  openUrl(url: string) {
    this.openUrlEvent.emit(url);
  }

  handleMessageAction(action: string, message: Message) {
    this.messageAction.emit({ action, message });
  }

  onEditingContentChange(value: string) {
    this.editingContentChange.emit(value);
  }
}
