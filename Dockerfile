FROM jekyll/jekyll:4.0.1

WORKDIR /srv/jekyll

# Copy the Gemfile
COPY Gemfile ./

# Install gems
RUN bundle install --clean --force

# Copy the rest of the application code
COPY . .

# Expose port 4000
EXPOSE 4000

# Run the command
CMD ["bundle", "exec", "jekyll", "serve"]