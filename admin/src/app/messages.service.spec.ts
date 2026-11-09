import { TestBed } from '@angular/core/testing';
import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  let messages: MessagesService;

  beforeEach(() => {
    messages = TestBed.inject(MessagesService);
  });

  it("ne renvoie rien tant qu'aucun message n'a été annoncé", () => {
    expect(messages.recuperer()).toBeNull();
  });

  it('renvoie le message annoncé une seule fois', () => {
    messages.annoncer('La pièce « Antivol en U » a été ajoutée.');

    expect(messages.recuperer()).toBe('La pièce « Antivol en U » a été ajoutée.');
    expect(messages.recuperer()).toBeNull();
  });

  it('garde seulement le dernier message annoncé', () => {
    messages.annoncer('Premier');
    messages.annoncer('Second');

    expect(messages.recuperer()).toBe('Second');
  });
});
