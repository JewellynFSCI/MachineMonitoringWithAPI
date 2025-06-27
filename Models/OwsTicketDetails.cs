using System.Globalization;

namespace MachineMonitoring.Models
{
    public class OwsTicketDetails
    {
        public int id {  get; set; }
        public string? controlno { get; set; }
        public int plantno { get; set; }
        public string? machinecode { get; set; }
        public string? condition { get; set; }
        public string? ownership { get; set; }
        public DateTime? requestdate { get; set; }
        public string? requestor { get; set; }
        public string? mesuppport { get; set; }
        public string? status { get; set; }
    }
}
