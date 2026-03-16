---
title: AI Assistant Guide
---

# aws-cognito-tools — AI Assistant Guide

> 🚧 Placeholder — will be populated during implementation.

This guide explains the codebase structure and conventions to AI coding assistants working on this project.

## Architecture

Three-layer pattern:
1. **Layer 1:** `src/cognitoTools/` — `AwsCognitoTools` class (X-Ray-enabled SDK v3 client wrapper)
2. **Layer 2:** `src/cognitoPlugin/` — get-dotenv plugin mounting `aws cognito pull|purge`
3. **Layer 3:** `src/cli/aws-cognito-tools/` — standalone CLI embedding get-dotenv + plugin

## Reference

- [Dev Spec](https://jeeves.johngalt.id/browse/j/domains/projects/smoz/cognito/dev-spec.md)
- [Dev Plan](https://jeeves.johngalt.id/browse/j/domains/projects/smoz/cognito/dev-plan.md)
- Reference implementation: `@karmaniverous/aws-secrets-manager-tools`
