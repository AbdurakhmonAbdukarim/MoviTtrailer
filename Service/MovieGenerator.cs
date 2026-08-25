using System.Text.Json;
using Bogus;
using MovieStore.Models;

namespace MovieStore.Service;

public class MovieGenerator
{
    // Til -> LocaleData (fayldan o'qiladi, bir marta)
    private readonly Dictionary<string, LocaleData> _locales;

    // Konstruktor: klass yaratilganda locales.json o'qiladi.
    public MovieGenerator()
    {
        string path = Path.Combine("Data", "locales.json");
        string json = File.ReadAllText(path);

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        _locales = JsonSerializer.Deserialize<Dictionary<string, LocaleData>>(json, options)
                   ?? new Dictionary<string, LocaleData>();
    }

    public List<Movie> GeneratePage(long userSeed, int page, string lang,
                                    double likesAvg, double reviewsAvg, int pageSize = 10)
    {
        int combinedSeed = (int)(userSeed + page);

        // Til ma'lumotini olamiz (topilmasa "en")
        LocaleData locale = _locales.GetValueOrDefault(lang, _locales["en"]);

        var faker = new Faker<Movie>(lang)
            .RuleFor(m => m.Title, f =>
            {
                string adjective = f.PickRandom(locale.Adjectives);
                string noun = f.PickRandom(locale.Nouns);
                return adjective + " " + noun;
            })
            .RuleFor(m => m.Genre, f => f.PickRandom(locale.Genres))
            .RuleFor(m => m.Year, f => f.Date.Past(60).Year)
            .RuleFor(m => m.Actors, f => new List<string>
            {
                f.Name.FullName(),
                f.Name.FullName()
            });

        faker.UseSeed(combinedSeed);
        List<Movie> movies = faker.Generate(pageSize);

        Random likesRandom = new Random(combinedSeed + 999);

        for (int i = 0; i < movies.Count; i++)
        {
            movies[i].Index = (page - 1) * pageSize + i + 1;
            movies[i].Likes = CalculateCount(likesAvg, likesRandom);

            int reviewCount = CalculateCount(reviewsAvg, likesRandom);
            movies[i].Reviews = MakeReviews(reviewCount, lang, combinedSeed + i);
        }

        return movies;
    }

    private int CalculateCount(double average, Random r)
    {
        int whole = (int)average;
        double frac = average - whole;
        int count = whole;
        if (r.NextDouble() < frac) count = count + 1;
        return count;
    }

    private List<string> MakeReviews(int count, string lang, int seed)
    {
        var reviewFaker = new Faker(lang);
        reviewFaker.Random = new Randomizer(seed);
        List<string> reviews = new List<string>();
        for (int i = 0; i < count; i++)
            reviews.Add(reviewFaker.Rant.Review());
        return reviews;
    }
}