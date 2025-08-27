using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace MachineMonitoring.Models.ViewModel
{
    public class AdminVM
    {
        public List<ProductionMap>? ProductionMaps { get; set; }

        public List<Plant> Plants { get; set; }

        public List<Machine> Machines { get; set; }

        public List<MachineLocation> MachineLocations { get; set; }

        public List<DbResponse> GetDbResponse { get; set; }
        public List<MachineStatusDetails> machineStatusDetails { get; set; }
        public List<MCStatusColor> mcStatusColor { get; set; }
        public List<AutoTicketModel> autoTicketModels { get; set; }
        public List<OwsDetails> owsDetails { get; set; }
        public List<OwsTicketDetails> OwsTicketDetails { get; set; }
        public List<TicketResponse> ticketResponses { get; set; }
        public List<DowntimeDetails> downtimeDetails { get; set; }

    }
}
