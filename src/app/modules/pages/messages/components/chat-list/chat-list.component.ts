import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked, AfterViewInit, OnDestroy, ChangeDetectionStrategy, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { Message } from '../../interfaces/message.interface';
import { Token } from '@shared/interfaces/token.interface';

@Component({
  selector: 'worky-chat-list',
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ChatListComponent implements AfterViewChecked, AfterViewInit, OnDestroy, OnChanges {
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
  private previousIsLoading = true;
  private scrollAttempts = 0;
  private maxScrollAttempts = 10;
  private mutationObserver: MutationObserver | null = null;
  private initialScrollTimeout: any;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    // Try to scroll to bottom after view is initialized
    if (this.messages.length > 0 && !this.scrollPositioned) {
      this.setupMutationObserver();
      setTimeout(() => {
        this.forceScrollToBottom();
      }, 200);
    }
  }

  private setupMutationObserver() {
    if (!this.messagesContainer || this.mutationObserver) {
      return;
    }

    // Observe changes in the messages list container
    this.mutationObserver = new MutationObserver(() => {
      if (this.initialLoad && !this.scrollPositioned && !this.isRestoringScroll) {
        clearTimeout(this.initialScrollTimeout);
        this.initialScrollTimeout = setTimeout(() => {
          this.forceScrollToBottom();
        }, 50);
      }
    });

    const messagesList = this.messagesContainer.nativeElement.querySelector('.messages-list');
    if (messagesList) {
      this.mutationObserver.observe(messagesList, {
        childList: true,
        subtree: true
      });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Handle isLoading change - when loading finishes, scroll to bottom
    if (changes['isLoading']) {
      const wasLoading = changes['isLoading'].previousValue;
      const isLoading = changes['isLoading'].currentValue;
      
      if (wasLoading && !isLoading && this.messages.length > 0 && !this.scrollPositioned) {
        // Loading just finished, scroll to bottom
        this.initialLoad = true;
        this.scrollPositioned = false;
        this.scrollAttempts = 0;
        
        // Setup mutation observer if not already set up
        setTimeout(() => {
          this.setupMutationObserver();
          this.forceScrollToBottom();
        }, 100);
      }
      
      this.previousIsLoading = isLoading;
    }

    if (changes['messages'] && this.messages.length > 0) {
      const previousMessages = changes['messages'].previousValue;
      const currentMessages = changes['messages'].currentValue;
      const isFirstLoad = !previousMessages || previousMessages.length === 0;
      
      if (isFirstLoad) {
        this.initialLoad = true;
        this.scrollPositioned = false;
        this.isAtBottom = true;
        this.scrollAttempts = 0;
        
        // Force scroll to bottom on initial load with multiple attempts
        setTimeout(() => {
          this.forceScrollToBottom();
        }, 100);
        
        setTimeout(() => {
          this.initialLoad = false;
        }, 1000);
      } else {
        // Check if messages were prepended (loading previous messages)
        const isPrepended = previousMessages.length > 0 && 
                           currentMessages.length > previousMessages.length && 
                           currentMessages[0]._id !== previousMessages[0]._id;

        if (isPrepended && this.messagesContainer) {
          this.preserveScrollPosition(previousMessages, currentMessages);
        } else {
          // Check if new message was added at the end
          const isNewMessageAtEnd = previousMessages.length > 0 && 
                                    currentMessages.length > previousMessages.length &&
                                    currentMessages[currentMessages.length - 1]._id !== previousMessages[previousMessages.length - 1]?._id;
          
          if (isNewMessageAtEnd) {
            // Check if the new message is from current user (always scroll for own messages)
            const lastMessage = currentMessages[currentMessages.length - 1];
            const isFromCurrentUser = lastMessage && lastMessage.senderId === this.currentUserId;
            
            // Check if user is near bottom (within 150px threshold for better UX)
            const shouldAutoScroll = isFromCurrentUser || this.shouldAutoScrollToBottom();
            
            if (shouldAutoScroll && !this.isRestoringScroll) {
              // Auto scroll to bottom for new messages
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  if (this.messagesContainer && !this.isRestoringScroll) {
                    const element = this.messagesContainer.nativeElement;
                    element.scrollTop = element.scrollHeight;
                    this.isAtBottom = true;
                    this.showScrollToBottomButton = false;
                  }
                });
              });
            }
          } else if (this.isAtBottom && !this.isRestoringScroll) {
            // If we were at bottom and messages were updated, stay at bottom
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
  }

  private shouldAutoScrollToBottom(): boolean {
    if (!this.messagesContainer) {
      return false;
    }
    
    const element = this.messagesContainer.nativeElement;
    const scrollTop = element.scrollTop;
    const clientHeight = element.clientHeight;
    const scrollHeight = element.scrollHeight;
    
    // Auto scroll if within 150px of bottom (more lenient threshold)
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= 150;
  }

  private preserveScrollPosition(previousMessages: Message[], currentMessages: Message[]) {
    if (!this.messagesContainer) return;

    const element = this.messagesContainer.nativeElement;

    // Captured BEFORE the prepended (older) messages render. The standard, reliable
    // way to keep the viewport anchored when content is added on top: offset scrollTop
    // by exactly how much the scroll height grew, so the same messages stay in view.
    const oldScrollHeight = element.scrollHeight;
    const oldScrollTop = element.scrollTop;

    this.isRestoringScroll = true;
    element.style.scrollBehavior = 'auto';

    // Two frames: let Angular render the new messages, then compensate the scroll.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!this.messagesContainer) {
          this.isRestoringScroll = false;
          return;
        }
        const el = this.messagesContainer.nativeElement;
        const heightGrowth = el.scrollHeight - oldScrollHeight;
        if (heightGrowth > 0) {
          el.scrollTop = oldScrollTop + heightGrowth;
        }
        el.style.scrollBehavior = '';
        this.isRestoringScroll = false;
        this.anchorMessageId = null;
      });
    });
  }

  ngAfterViewChecked() {
    if (this.initialLoad && this.messages.length > 0 && this.messagesContainer && !this.scrollPositioned && !this.isRestoringScroll) {
      this.forceScrollToBottom();
    }
  }

  private forceScrollToBottom() {
    if (!this.messagesContainer || this.isRestoringScroll) {
      // Retry if container not available yet
      if (this.scrollAttempts < this.maxScrollAttempts) {
        this.scrollAttempts++;
        setTimeout(() => {
          this.forceScrollToBottom();
        }, 100);
      }
      return;
    }

    const element = this.messagesContainer.nativeElement;
    
    // Disable smooth scrolling for instant positioning
    const originalScrollBehavior = element.style.scrollBehavior;
    element.style.scrollBehavior = 'auto';
    
    // Force scroll to bottom immediately - use a more aggressive approach
    const scrollToBottom = () => {
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      
      if (scrollHeight > clientHeight) {
        // Set scroll position to maximum - this ensures we're at the absolute bottom
        element.scrollTop = scrollHeight;
        
        // Verify immediately
        const newScrollTop = element.scrollTop;
        const newScrollHeight = element.scrollHeight;
        const distanceFromBottom = newScrollHeight - newScrollTop - clientHeight;
        
        if (distanceFromBottom <= 1) {
          // Successfully scrolled to bottom
          this.isAtBottom = true;
          this.showScrollToBottomButton = false;
          this.scrollPositioned = true;
          this.scrollAttempts = 0;
          element.style.scrollBehavior = originalScrollBehavior;
          return true;
        } else {
          // Not at bottom yet, scroll again with the new scrollHeight
          element.scrollTop = newScrollHeight;
          return false;
        }
      } else {
        // Content fits in container
        this.scrollPositioned = true;
        this.scrollAttempts = 0;
        element.style.scrollBehavior = originalScrollBehavior;
        return true;
      }
    };
    
    // Try immediately
    scrollToBottom();
    
    // Use requestAnimationFrame for multiple attempts to catch DOM updates
    requestAnimationFrame(() => {
      if (!scrollToBottom()) {
        requestAnimationFrame(() => {
          if (!scrollToBottom()) {
            requestAnimationFrame(() => {
              scrollToBottom();
              // Restore scroll behavior after all attempts
              setTimeout(() => {
                if (this.messagesContainer) {
                  this.messagesContainer.nativeElement.style.scrollBehavior = originalScrollBehavior;
                }
              }, 100);
            });
          }
        });
      }
    });
    
    // Final verification after a longer delay to catch any late DOM updates
    clearTimeout(this.initialScrollTimeout);
    this.initialScrollTimeout = setTimeout(() => {
      if (this.messagesContainer) {
        const verifyElement = this.messagesContainer.nativeElement;
        const verifyScrollHeight = verifyElement.scrollHeight;
        const verifyClientHeight = verifyElement.clientHeight;
        const verifyScrollTop = verifyElement.scrollTop;
        const distanceFromBottom = verifyScrollHeight - verifyScrollTop - verifyClientHeight;
        
        if (distanceFromBottom > 1) {
          // Still not at bottom, force it one more time
          verifyElement.style.scrollBehavior = 'auto';
          verifyElement.scrollTop = verifyScrollHeight;
          verifyElement.style.scrollBehavior = originalScrollBehavior;
        }
        
        // Mark as positioned after final attempt
        if (!this.scrollPositioned) {
          this.scrollPositioned = true;
        }
      }
    }, 800);
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

  ngOnDestroy() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    if (this.initialScrollTimeout) {
      clearTimeout(this.initialScrollTimeout);
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    if (this.loadMoreTimeout) {
      clearTimeout(this.loadMoreTimeout);
    }
  }
}
