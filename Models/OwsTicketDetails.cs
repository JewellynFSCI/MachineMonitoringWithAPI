using System.Globalization;

namespace MachineMonitoring.Models
{
    public class OwsTicketDetails
    {
        public int id {  get; set; }
        public string? controlno { get; set; }
        public int type { get; set; }
        public int plantno { get; set; }
        public string? process {  get; set; }
        public string? area { get; set; }
        public string? machinecode { get; set; }
        public DateTime mc_error_buyoff_repair_date { get; set; }
        public string? details { get; set; }
        public string? requestor { get; set; }
        public string? me_support { get; set; }
        public string? errorcode { get; set; }
        public string? errorname { get; set; }
        public int status { get; set; }
    }
}
