using System.Net.NetworkInformation;
using MachineMonitoring.Models;
using Microsoft.AspNetCore.Mvc;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Database;
using MachineMonitoring.DataAccess.Repository;
using System.Data;
using MySql.Data.MySqlClient;
using Dapper;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json;
using System.Text;
using MachineMonitoring.Models.ViewModel;
using MySqlX.XDevAPI.Common;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Model;

namespace MachineMonitoring.Controllers
{
    public class AutoTicketController : Controller
    {
        private readonly ILogger<AutoTicketController> _logger;
        private readonly AdminRepo _adminrepo;
        private readonly AdminVM _adminvm;

        public AutoTicketController(ILogger<AutoTicketController> logger, AdminRepo adminrepo, AdminVM adminvm)
        {
            _logger = logger;
            _adminrepo = adminrepo;
            _adminvm = adminvm;
        }

        
        [HttpGet]
        [Route("AutoTicket/TicketToOWS/{machineCode}")]
        public async Task<IActionResult> TicketToOWS(string machineCode)
        {
            try
            {
                //Check if ticket exists
                var ticketExists = await _adminrepo.CheckMachineTicket(machineCode);
                if (!ticketExists.Success)      // Ticket exists with this machine code
                {
                    //Get ticket details
                    var viewModel = new AdminVM
                    {
                        OwsTicketDetails = await _adminrepo.GetTicketDetails(machineCode)
                    };

                    ViewBag.Result = "NG";
                    ViewBag.Message = $"This machine: {machineCode}  has a task that has not been completed yet";
                    return View(viewModel);
                }


                //Check if machine code has location
                var mcLoc = await _adminrepo.ValidateMachineCode(machineCode);
                if (!mcLoc.Success)     //Machine code has no location in the system
                {
                    var result = "Failed";
                    var message = mcLoc.Message;
                    var machinecode = machineCode;
                    return RedirectToAction("TicketSent", new { machinecode, result, message });
                }
                var MachineDetails= await _adminrepo.GetMachineDetails(machineCode);
                var process = MachineDetails[0].Process;

                //Get Machine Details
                var machinedetails = new AdminVM
                {
                    autoTicketModels = MachineDetails,
                    downtimeDetails = await _adminrepo.GetDowntimeDetails(process)
                };
                ViewBag.Result = "OK";
                ViewBag.Message = null;
                return View(machinedetails);

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading AutoTicket view");
                return StatusCode(500, "Internal Server Error");
            }

        }

        [HttpPost]
        public async Task<IActionResult> SendTicketToOws(AutoTicketModel model)
        {
            try
            {
                //Get OWS account to be use
                var owsDetails = await _adminrepo.GetOwsDetails();
                var ows = owsDetails.FirstOrDefault();

                var response = await _adminrepo.CreateOWSTicketAPI(model, ows);
                if (response.Contains("successfully", StringComparison.OrdinalIgnoreCase))
                {
                    var result = "Success";
                    var message = "Request already sent!";
                    var machinecode = model.MachineCode;
                    return RedirectToAction("TicketSent",new { machinecode, result, message });
                }

                return StatusCode(500, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending OWS ticket");
                var result = "Failed";
                var message = $"An error occurred: {ex.Message}";
                var machinecode = model.MachineCode;
                return RedirectToAction("TicketSent", new { machinecode, result, message });
            }
        }

        public IActionResult TicketSent(string machinecode, string result, string message)
        {
            var ticket = new TicketResponse
            {
                MachineCode = machinecode,
                Result = result,
                Message = message
            };

            var viewmodel = new AdminVM
            {
                ticketResponses = new List<TicketResponse> { ticket }
            };

            return View(viewmodel);
        }

    }
}
