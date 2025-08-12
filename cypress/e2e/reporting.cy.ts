/// <reference types="cypress" />

describe('Reporting Suite', () => {
  it('should load reporting dashboard', () => {
    cy.visit('/reporting?test=1', { failOnStatusCode: false, headers: { 'x-cypress-test': '1' } });
    cy.contains('Reporting Dashboard');
    cy.contains('Call Volume');
    cy.contains('Agreement Tracking');
    cy.contains('Lists Out');
  });

  it('should navigate to call volume report', () => {
    cy.visit('/reporting?test=1', { failOnStatusCode: false, headers: { 'x-cypress-test': '1' } });
    cy.contains('Call Volume').click();
    cy.url().should('include', '/reporting/call-volume');
    cy.contains('Call Volume Report');
  });

  it('should display executive dashboard KPIs', () => {
    cy.visit('/reporting?test=1', { failOnStatusCode: false, headers: { 'x-cypress-test': '1' } });
    cy.contains('Executive Dashboard');
    cy.contains('Call Volume (This Week)');
    cy.contains('Agreements (This Month)');
    cy.contains('Lists Out (This Month)');
    cy.contains('Conversion Rate');
  });
}); 