using MovieStore.Service;
var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

var generator = new MovieGenerator();
app.MapGet("/api/movies", (long seed, int page, string lang, double likes, double reviews) =>
{
    var movies = generator.GeneratePage(seed, page, lang, likes, reviews);
    return Results.Ok(movies);
});
app.Run();
