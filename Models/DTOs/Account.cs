namespace MachineMonitoring.Models.DTOs
{
    public class Account
    {
        public string Username { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Office { get; set; } = string.Empty;
        public List<string> MemberOf { get; set; } = new List<string>();

        public string GetFullName()
        {
            return $"{DisplayName} ({Office})";
        }
    }
}
