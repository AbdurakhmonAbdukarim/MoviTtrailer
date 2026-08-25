namespace MovieStore.Models;

public class Movie
{
    public int Index { get; set; }
    public string Title { get; set; } = "";
    public List<string> Actors { get; set; } = new();
    public string Genre { get; set; } = "";
    public int Year { get; set; }
    
    
    public int Likes { get; set; }             
    public List<string> Reviews { get; set; } = new(); 
}