namespace MachineMonitoring.Models
{
    public class MachineStatusDetails
    {
        public int? machinelocationid { get; set; }
        public string? machinecode { get; set; }
        public int productionmapid { get; set; }
        public int X { get; set; }
        public int Y { get; set; }
        public int status_id { get; set; }
        public string? status { get; set; }
        public string? hex_value { get; set; }
        public string? controlno { get; set; }
        public string? type { get; set; }
        public int plantno { get; set; }
        public string? process { get; set; }
        public string? area { get; set; }
        public DateTime mc_error_buyoff_repair_date { get; set; }
        public string? details { get; set; }
        public string? requestor { get; set; }
        public string? me_support { get; set; }
        public string? errorcode { get; set; }
        public string? errorname { get; set; }
        public DateTime completedDate { get; set; }
        
    }
}
