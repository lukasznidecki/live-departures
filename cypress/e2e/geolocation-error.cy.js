describe('Geolocation error handling', () => {
  const SUCCESS_LAT = 50.0671;
  const SUCCESS_LNG = 19.9445;

  it('shows an error and allows retrying geolocation', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        const stub = cy.stub(win.navigator.geolocation, 'getCurrentPosition');

        // Initial attempt: high accuracy call fails
        stub
          .onCall(0)
          .callsFake((success, error) => error({ code: 1, message: 'User denied Geolocation' }));

        // Fallback low accuracy call also fails
        stub
          .onCall(1)
          .callsFake((success, error) => error({ code: 1, message: 'User denied Geolocation' }));

        // Retry after user action succeeds
        stub.onCall(2).callsFake((success) => {
          success({
            coords: {
              latitude: SUCCESS_LAT,
              longitude: SUCCESS_LNG,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          });
        });
      }
    });

    cy.get('.error-overlay', { timeout: 15000 }).should('be.visible');
    cy.contains('Unable to get your location').should('be.visible');

    cy.get('.retry-button').click();

    // Loading overlay appears during retry and eventually disappears
    cy.get('.loading-overlay').should('be.visible');
    cy.get('.loading-overlay', { timeout: 15000 }).should('not.exist');

    cy.get('.error-overlay', { timeout: 15000 }).should('not.exist');
    cy.get('.leaflet-map').should('be.visible');
  });
});
