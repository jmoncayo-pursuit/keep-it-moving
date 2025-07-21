# Documentation Policy

## Public Documentation Standards

### Only Document What Works
- Features must be functionally tested in development before any public documentation
- All claims must be verified through actual usage, not theoretical implementation
- Performance metrics require actual benchmarks, not estimates
- Platform support requires testing on actual platforms

### Testing Requirements for Public Claims
- **Functionality**: Feature must work end-to-end in development environment
- **Performance**: Actual measurements, not theoretical targets
- **Compatibility**: Tested on claimed platforms/browsers/versions
- **User Experience**: Manually verified user workflows

### What NOT to Include Publicly
- Future features or roadmap items
- Untested performance claims
- Unverified platform compatibility
- Theoretical capabilities
- Development plans or intentions

### Documentation Review Process
1. Feature implemented and working in development
2. Manual testing completed successfully
3. Documentation written based on actual behavior
4. Review documentation against actual functionality
5. Only then publish or update public docs

### Private vs Public Documentation
- **Private** (`.kiro/private/`): Plans, ideas, untested features, internal notes
- **Public** (README, docs/): Only verified, working functionality

## Commit Message Guidelines

### Avoid Problematic Language
- Don't use "honest" (implies previous dishonesty)
- Don't use "fix lies" or similar language
- Don't reference "false claims" in commit messages

### Better Alternatives
- "Update documentation to reflect current functionality"
- "Correct feature descriptions"
- "Align docs with actual implementation"
- "Remove unverified claims"
- "Simplify documentation"

### Commit Message Style
- Focus on what changed, not why it was wrong before
- Use neutral, factual language
- Describe the improvement, not the problem being fixed