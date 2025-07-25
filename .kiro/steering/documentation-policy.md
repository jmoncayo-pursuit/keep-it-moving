# Documentation Policy

## Contest-Ready Documentation Standards

### Hackathon Documentation Focus
- Emphasize innovation and technical breakthroughs
- Highlight joyful user experience and delightful interactions
- Document actual working features with clear demos
- Show technical difficulty and ambitious problem-solving
- Demonstrate relevance to developer tools and GitHub ecosystem

### Only Document What Works
- Features must be functionally tested in development before any public documentation
- All claims must be verified through actual usage, not theoretical implementation
- Performance metrics require actual benchmarks, not estimates
- Platform support requires testing on actual platforms
- Mobile functionality must be tested on actual mobile devices before documenting

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
- **Private** (`.kiro/`): All Kiro-related files including specs, steering, and private documents
- **Public** (README, docs/): Only verified, working functionality

### Version Control
- The entire `.kiro/` directory is excluded from git tracking via .gitignore
- Do not reference .kiro files in commit messages or public documentation
- Keep all development planning, specs, and task lists within the .kiro directory

### Task Management
- Task lists and planning documents should be kept in the `.kiro/` directory
- Never mention private task lists in commit messages
- Only commit code changes after functionality is verified to work
- QR code and mobile functionality must be tested on actual devices before committing

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
- Never reference private task lists or planning documents
- Only commit after functionality is verified to work
- For mobile/QR features, only commit after testing on actual devices