describe('Chat basic flows', () => {
  it('navigates to Chat and loads conversations', () => {
    cy.visit('/chat');
    cy.contains('Select a conversation').should('exist');
  });
});


