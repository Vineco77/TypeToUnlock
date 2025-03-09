import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompletionMessageComponent } from './completion-message.component';

describe('CompletionMessageComponent', () => {
  let component: CompletionMessageComponent;
  let fixture: ComponentFixture<CompletionMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompletionMessageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompletionMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
