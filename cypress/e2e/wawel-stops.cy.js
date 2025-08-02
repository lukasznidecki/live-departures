describe('Simple Stop Check for Wawel Castle', () => {
  const WAWEL_LAT = 50.0540;
  const WAWEL_LNG = 19.9362;

  it('should find tram and bus stops near Wawel Castle', () => {
    cy.visitWithGeolocation('/', WAWEL_LAT, WAWEL_LNG);

    cy.get('button[aria-label="Tram stops"]').click();
    cy.get('.loading-state', { timeout: 15000 }).should('not.exist');
    cy.get('.stops-grid', { timeout: 15000 }).should('be.visible');
    cy.get('.stop-card').its('length').should('be.gt', 0);

    cy.get('button[aria-label="Bus stops"]').click();
    cy.get('.loading-state', { timeout: 15000 }).should('not.exist');
    cy.get('.stops-grid', { timeout: 15000 }).should('be.visible');
    cy.get('.stop-card').its('length').should('be.gt', 0);
  });
});
