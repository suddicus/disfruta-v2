describe('Login E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should login successfully with valid credentials', () => {
    cy.get('[data-cy=email-input]').type('test@example.com');
    cy.get('[data-cy=password-input]').type('password123');
    cy.get('[data-cy=login-button]').click();
    
    cy.url().should('include', '/dashboard');
    cy.get('[data-cy=user-name]').should('contain', 'Test User');
  });

  it('should show error with invalid credentials', () => {
    cy.get('[data-cy=email-input]').type('invalid@example.com');
    cy.get('[data-cy=password-input]').type('wrongpassword');
    cy.get('[data-cy=login-button]').click();
    
    cy.get('[data-cy=error-message]').should('be.visible');
    cy.get('[data-cy=error-message]').should('contain', 'Invalid credentials');
  });

  it('should validate form fields', () => {
    cy.get('[data-cy=login-button]').click();
    
    cy.get('[data-cy=email-error]').should('contain', 'Email is required');
    cy.get('[data-cy=password-error]').should('contain', 'Password is required');
  });
});
