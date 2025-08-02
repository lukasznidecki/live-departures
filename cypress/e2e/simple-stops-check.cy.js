describe('Simple Stop Check for Dworzec Główny', () => {
  const DWORZEC_GLOWNY_LAT = 50.0671;
  const DWORZEC_GLOWNY_LNG = 19.9445;

  it('should log all stops found near Dworzec Główny', () => {
    cy.visitWithGeolocation('/', DWORZEC_GLOWNY_LAT, DWORZEC_GLOWNY_LNG);

    cy.get('button[aria-label="Tram stops"]').click();
    cy.get('.loading-state', { timeout: 15000 }).should('not.exist');
    cy.get('.stops-grid', { timeout: 15000 }).should('be.visible');

    cy.get('.stop-card').each(($stop, index) => {
      cy.wrap($stop).find('.stop-name').then(($name) => {
        const stopText = $name.text();
        cy.log(`Tram Stop ${index + 1}: ${stopText}`);

        cy.window().then((win) => {
          win.console.log(`Tram Stop ${index + 1}: ${stopText}`);
        });
      });
    });

    cy.get('.stop-card')
      .then(($stops) => {
        cy.log(`Total tram stops found: ${$stops.length}`);
        return $stops;
      })
      .its('length')
      .should('be.gt', 0);

    cy.get('button[aria-label="Bus stops"]').click();
    cy.get('.loading-state', { timeout: 15000 }).should('not.exist');
    cy.get('.stops-grid', { timeout: 15000 }).should('be.visible');

    cy.get('.stop-card').each(($stop, index) => {
      cy.wrap($stop).find('.stop-name').then(($name) => {
        const stopText = $name.text();
        cy.log(`Bus Stop ${index + 1}: ${stopText}`);
      });
    });

    cy.get('.stop-card')
      .then(($stops) => {
        cy.log(`Total bus stops found: ${$stops.length}`);
        return $stops;
      })
      .its('length')
      .should('be.gt', 0);
  });
});
