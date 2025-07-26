// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to mock geolocation
Cypress.Commands.add('mockGeolocation', (latitude, longitude) => {
  cy.window().then((win) => {
    cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((success, error) => {
      setTimeout(() => {
        success({
          coords: {
            latitude: latitude,
            longitude: longitude,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        });
      }, 100);
    });
    
    cy.stub(win.navigator.geolocation, 'watchPosition').callsFake((success, error) => {
      setTimeout(() => {
        success({
          coords: {
            latitude: latitude,
            longitude: longitude,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        });
      }, 100);
      return 1; // Return a mock watch ID
    });
  });
});

// Custom command to visit with mocked geolocation
Cypress.Commands.add('visitWithGeolocation', (url, latitude, longitude) => {
  cy.visit(url, {
    onBeforeLoad: (win) => {
      cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((success, error) => {
        setTimeout(() => {
          success({
            coords: {
              latitude: latitude,
              longitude: longitude,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          });
        }, 100);
      });
      
      cy.stub(win.navigator.geolocation, 'watchPosition').callsFake((success, error) => {
        setTimeout(() => {
          success({
            coords: {
              latitude: latitude,
              longitude: longitude,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          });
        }, 100);
        return 1;
      });
    }
  });
});

// Custom command to wait for stops to load
Cypress.Commands.add('waitForStopsToLoad', () => {
  cy.get('.loading-overlay', { timeout: 15000 }).should('not.exist');
  cy.get('.stops-list', { timeout: 15000 }).should('be.visible');
});

// Custom command to select transport type
Cypress.Commands.add('selectTransportType', (type) => {
  cy.get(`[data-cy="${type}-tab"]`).click();
  cy.get(`[data-cy="${type}-tab"]`).should('have.class', 'active');
});