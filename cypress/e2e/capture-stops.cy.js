describe('Capture Stops for Dworzec Główny', () => {
  const DWORZEC_GLOWNY_LAT = 50.0671;
  const DWORZEC_GLOWNY_LNG = 19.9445;

  it('should capture all stops found near Dworzec Główny', () => {
    cy.visitWithGeolocation('/', DWORZEC_GLOWNY_LAT, DWORZEC_GLOWNY_LNG);

    let tramStops = [];
    let busStops = [];

    cy.get('button[aria-label="Tram stops"]').click();
    cy.get('.loading-state', { timeout: 15000 }).should('not.exist');
    cy.get('.stops-grid', { timeout: 15000 }).should('be.visible');

    cy.get('.stop-card').each(($stop, index) => {
      cy.wrap($stop).find('.stop-name').then(($name) => {
        tramStops.push($name.text().trim());
      });
    });

    cy.get('button[aria-label="Bus stops"]').click();
    cy.get('.loading-state', { timeout: 15000 }).should('not.exist');
    cy.get('.stops-grid', { timeout: 15000 }).should('be.visible');

    cy.get('.stop-card').each(($stop, index) => {
      cy.wrap($stop).find('.stop-name').then(($name) => {
        busStops.push($name.text().trim());
      });
    }).then(() => {
      const results = {
        location: 'Dworzec Główny w Krakowie',
        coordinates: { lat: DWORZEC_GLOWNY_LAT, lng: DWORZEC_GLOWNY_LNG },
        timestamp: new Date().toISOString(),
        tramStops: tramStops,
        busStops: busStops,
        totalTramStops: tramStops.length,
        totalBusStops: busStops.length
      };

      cy.writeFile('cypress/results/dworzec-stops.json', results);

      expect(tramStops.length).to.be.greaterThan(0, 'Should find at least one tram stop');
      expect(busStops.length).to.be.greaterThan(0, 'Should find at least one bus stop');

      cy.log(`Found ${tramStops.length} tram stops. First 3: ${tramStops.slice(0, 3).join(', ')}`);
      cy.log(`Found ${busStops.length} bus stops. First 3: ${busStops.slice(0, 3).join(', ')}`);
    });
  });
});
